// Elgin Campus Room Reservations — app logic (vanilla JS, no build step).
// Data store: Supabase Postgres (see supabase/schema.sql). Auth: Supabase Auth
// with Google as the OAuth provider (configured in the Supabase dashboard —
// this file never talks to Google directly).
(function () {
  "use strict";

  var REFRESH_INTERVAL_MS = 30000; // recompute "is it occupied right now" as time passes
  var POLL_FALLBACK_MS = 45000; // only used if the Realtime channel fails to (re)connect

  // The Supabase JS UMD bundle exposes a global named `supabase` — our own
  // client instance is deliberately NOT named that to avoid shadowing it.
  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  var currentFloor = 3;
  var currentModalRoom = null; // { floor, roomId }
  var editingReservationId = null; // non-null while the reserve form is in "edit" mode
  var currentSession = null; // Supabase Auth session, or null when signed out

  var reservationsCache = []; // in-memory mirror of the `reservations` table
  var reservationsLoaded = false;
  var pollFallbackTimer = null;

  // ---------------------------------------------------------------------
  // Data layer (Supabase)
  // ---------------------------------------------------------------------

  // Maps a `reservations` row (snake_case, as Postgres returns it) to the
  // camelCase shape the rest of this file already works with.
  function mapRow(row) {
    return {
      id: row.id,
      floor: row.floor,
      roomId: row.room_id,
      date: row.reservation_date,
      startHour: row.start_hour,
      durationHours: row.duration_hours,
      email: row.email,
      name: row.name,
    };
  }

  async function refreshReservationsCache() {
    var res = await db.from("reservations").select("*");
    if (res.error) {
      console.error("Failed to load reservations:", res.error);
      return false;
    }
    reservationsCache = (res.data || []).map(mapRow);
    reservationsLoaded = true;
    return true;
  }

  // Re-fetches the whole table, then re-renders whatever's currently on
  // screen that depends on it (map occupancy, and the modal if it's open).
  async function reloadAndRender() {
    await refreshReservationsCache();
    updateOccupancy(currentFloor);
    if (currentModalRoom) {
      renderDayGrid();
      renderUpcomingList();
      renderModalStatus();
    }
  }

  function getReservationsFor(floor, roomId, date) {
    return reservationsCache.filter(function (r) {
      return r.floor === floor && r.roomId === roomId && r.date === date;
    });
  }

  function hasConflict(floor, roomId, date, startHour, durationHours, excludeId) {
    var proposedEnd = startHour + durationHours;
    return reservationsCache.some(function (r) {
      if (excludeId && r.id === excludeId) return false;
      if (r.floor !== floor || r.roomId !== roomId || r.date !== date) return false;
      var existingEnd = r.startHour + r.durationHours;
      return startHour < existingEnd && r.startHour < proposedEnd;
    });
  }

  // Building-wide "one room at a time" rule: does this user already have a
  // different reservation (any floor/room) whose time range overlaps the
  // requested one on the same date? Returns the conflicting reservation, or
  // null. excludeId lets an in-progress edit ignore its own prior booking.
  // This is a fast client-side pre-check only — the real backstop is the
  // database's own EXCLUDE constraint (supabase/schema.sql), which is what
  // actually prevents the race where two requests land at nearly the same
  // time; see handleReserveSubmit's error handling for that path.
  function hasCrossRoomConflict(email, date, startHour, durationHours, excludeId) {
    var proposedEnd = startHour + durationHours;
    for (var i = 0; i < reservationsCache.length; i++) {
      var r = reservationsCache[i];
      if (excludeId && r.id === excludeId) continue;
      if (r.email !== email || r.date !== date) continue;
      var existingEnd = r.startHour + r.durationHours;
      if (startHour < existingEnd && r.startHour < proposedEnd) {
        return r;
      }
    }
    return null;
  }

  // Postgres reports an EXCLUDE constraint violation as SQLSTATE 23P01.
  // PostgREST (Supabase's REST layer) surfaces that as error.code === "23P01".
  function isExclusionViolation(error) {
    if (!error) return false;
    if (error.code === "23P01") return true;
    var text = ((error.message || "") + " " + (error.details || "")).toLowerCase();
    return text.indexOf("exclusion") !== -1;
  }

  async function createReservation(payload) {
    return db.from("reservations").insert(payload).select();
  }

  async function updateReservation(id, payload) {
    return db.from("reservations").update(payload).eq("id", id).select();
  }

  async function deleteReservation(id) {
    return db.from("reservations").delete().eq("id", id);
  }

  // ---------------------------------------------------------------------
  // Realtime (with a polling fallback if the channel can't connect)
  // ---------------------------------------------------------------------

  function startPollFallback() {
    if (pollFallbackTimer) return;
    pollFallbackTimer = setInterval(reloadAndRender, POLL_FALLBACK_MS);
  }

  function stopPollFallback() {
    if (!pollFallbackTimer) return;
    clearInterval(pollFallbackTimer);
    pollFallbackTimer = null;
  }

  function setupRealtime() {
    db.channel("reservations-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reservations" },
        function () {
          reloadAndRender();
        }
      )
      .subscribe(function (status) {
        if (status === "SUBSCRIBED") {
          stopPollFallback();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          // Realtime isn't connecting (e.g. blocked network path) — fall
          // back to periodic refetching so the app still stays in sync.
          startPollFallback();
        }
      });
  }

  // ---------------------------------------------------------------------
  // Auth (Supabase Auth, Google OAuth provider)
  // ---------------------------------------------------------------------

  // The signed-in identity's email is now genuinely verified server-side by
  // Supabase (it issued/verified the session), unlike the old raw-GIS flow
  // that decoded a JWT client-side without checking its signature.
  function getCurrentUser() {
    var user = currentSession && currentSession.user;
    if (!user || !user.email) return null;
    var meta = user.user_metadata || {};
    var name = meta.full_name || meta.name || user.email;
    return { email: user.email, name: name };
  }

  function signIn() {
    db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
  }

  function signOut() {
    db.auth.signOut();
  }

  function renderAuthArea() {
    var user = getCurrentUser();
    var btn = document.getElementById("googleSignInButton");
    var infoEl = document.getElementById("signedInInfo");
    var nameEl = document.getElementById("signedInName");

    if (user) {
      if (btn) btn.style.display = "none";
      if (infoEl) infoEl.style.display = "flex";
      if (nameEl) nameEl.textContent = (user.name ? user.name + " " : "") + "(" + user.email + ")";
    } else {
      if (infoEl) infoEl.style.display = "none";
      if (btn) btn.style.display = "";
    }
  }

  // Gates the whole app (floor tabs, legend, map — everything in <main>)
  // behind sign-in. The header itself (app name + auth controls) always
  // stays visible; only the welcome screen or the app body is shown at a
  // time. Defaults to "signed out" (see the matching CSS defaults) so
  // there's no flash of the map before the auth check resolves.
  function updateAppGate() {
    var user = getCurrentUser();
    var welcome = document.getElementById("welcomeScreen");
    var mainApp = document.getElementById("mainApp");
    var floorTabs = document.getElementById("floorTabs");
    var legend = document.getElementById("legend");

    // Explicit display values, not "" (clearing an inline style would just
    // fall back to the #id CSS rules above — which default to none, and an
    // id selector's specificity beats the .floor-tabs/.legend class rules
    // that would otherwise show them again).
    if (user) {
      if (welcome) welcome.style.display = "none";
      if (mainApp) mainApp.style.display = "block";
      if (floorTabs) floorTabs.style.display = "flex";
      if (legend) legend.style.display = "flex";
    } else {
      if (welcome) welcome.style.display = "flex";
      if (mainApp) mainApp.style.display = "none";
      if (floorTabs) floorTabs.style.display = "none";
      if (legend) legend.style.display = "none";
    }
  }

  // Re-renders everything whose content depends on who is currently signed in.
  function refreshAuthUI() {
    renderAuthArea();
    updateAppGate();
    if (currentModalRoom) {
      exitEditMode();
      updateReserveFormVisibility();
      renderUpcomingList();
    }
  }

  function setupAuth() {
    db.auth.onAuthStateChange(function (_event, session) {
      currentSession = session;
      refreshAuthUI();
    });

    // Restores state on load — including right after the OAuth redirect
    // back from Google completes and Supabase parses the session out of the
    // URL.
    db.auth.getSession().then(function (result) {
      currentSession = (result.data && result.data.session) || null;
      refreshAuthUI();
    });
  }

  // ---------------------------------------------------------------------
  // Date / time helpers
  // ---------------------------------------------------------------------

  function formatDateLocal(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return y + "-" + m + "-" + day;
  }

  function todayStr() {
    return formatDateLocal(new Date());
  }

  // The earliest hour that's still bookable/viewable for a given date: the
  // full OPEN_HOUR..CLOSE_HOUR-1 range for any future date, but for today
  // only the current (still in-progress) hour onward — anything earlier
  // has already fully elapsed.
  function earliestRelevantHour(date) {
    if (date !== todayStr()) return OPEN_HOUR;
    return Math.max(OPEN_HOUR, new Date().getHours());
  }

  // A reservation is still "upcoming" (worth showing in the upcoming list)
  // if it's on a future date, or on today and its end time hasn't passed yet.
  function isReservationUpcoming(r) {
    var today = todayStr();
    if (r.date > today) return true;
    if (r.date < today) return false;
    return new Date().getHours() < r.startHour + r.durationHours;
  }

  function hourLabel(h) {
    var period = h >= 12 ? "PM" : "AM";
    var hh = h % 12;
    if (hh === 0) hh = 12;
    return hh + ":00 " + period;
  }

  function timeRangeLabel(startHour, durationHours) {
    return hourLabel(startHour) + " – " + hourLabel(startHour + durationHours);
  }

  // Returns the reservation covering "now" for this room, or null if free.
  function currentReservation(floor, roomId) {
    var now = new Date();
    var date = formatDateLocal(now);
    var hour = now.getHours();
    var list = getReservationsFor(floor, roomId, date);
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (hour >= r.startHour && hour < r.startHour + r.durationHours) {
        return r;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Floor map rendering
  // ---------------------------------------------------------------------

  function positionEl(el, rect, data) {
    el.style.left = (rect.x / data.canvasWidth) * 100 + "%";
    el.style.top = (rect.y / data.canvasHeight) * 100 + "%";
    el.style.width = (rect.w / data.canvasWidth) * 100 + "%";
    el.style.height = (rect.h / data.canvasHeight) * 100 + "%";
  }

  // The map is laid out with percentage-based positioning so it scales
  // with the container's actual rendered width — which isn't reliably
  // knowable at render time (e.g. the app may currently be gated/hidden
  // behind sign-in, giving every element a 0px layout box). So label
  // sizing/orientation is derived purely from each room's own w/h "map
  // units" (consistent within a floor), approximated against the map's
  // typical rendered width (bounded by main's max-width and padding).
  var APPROX_RENDERED_CANVAS_PX_WIDTH = 1240;

  function computeRoomLabelStyle(room, data) {
    var scale = APPROX_RENDERED_CANVAS_PX_WIDTH / data.canvasWidth;
    var wPx = room.w * scale;
    var hPx = room.h * scale;
    var isVertical = room.h > room.w * 1.3;
    var minDim = Math.min(wPx, hPx);

    var fontPx;
    if (minDim < 25) fontPx = 8;
    else if (minDim < 35) fontPx = 9;
    else if (minDim < 55) fontPx = 10.5;
    else fontPx = 11.5;

    // Shrink further if the id text is still too long to fit along the
    // axis it reads along (vertical labels read along the box's height;
    // horizontal labels read along its width).
    var textLen = String(room.id).length;
    var lengthAxisPx = (isVertical ? hPx : wPx) - 6; // minus box padding
    var pxPerChar = fontPx * 0.62; // rough average glyph advance
    if (textLen * pxPerChar > lengthAxisPx && lengthAxisPx > 0) {
      fontPx = Math.max(6.5, lengthAxisPx / (textLen * 0.62));
    }

    return { isVertical: isVertical, fontPx: Math.round(fontPx * 10) / 10 };
  }

  function renderFloor(floor) {
    currentFloor = floor;
    var data = FLOORS[floor];
    if (!data) return;

    var floorTitleEl = document.getElementById("floorTitle");
    floorTitleEl.textContent = data.title + (reservationsLoaded ? "" : " — loading reservations…");

    var canvas = document.getElementById("mapCanvas");
    canvas.innerHTML = "";
    canvas.style.aspectRatio = data.canvasWidth + " / " + data.canvasHeight;

    data.zones.forEach(function (zone) {
      var el = document.createElement("div");
      el.className = "zone-box";
      positionEl(el, zone, data);
      var label = document.createElement("span");
      label.className = "zone-label";
      label.textContent = zone.label;
      el.appendChild(label);
      canvas.appendChild(el);
    });

    data.rooms.forEach(function (room) {
      var el = document.createElement("div");
      el.className = "room-box";
      el.dataset.roomId = room.id;
      positionEl(el, room, data);

      var occupied = !!currentReservation(floor, room.id);
      el.classList.add(occupied ? "occupied" : "free");
      el.title = room.id + (occupied ? " — reserved now" : " — free now");
      el.tabIndex = 0;
      el.setAttribute("role", "button");

      var label = document.createElement("span");
      label.className = "room-label";
      label.textContent = room.id;
      var labelStyle = computeRoomLabelStyle(room, data);
      if (labelStyle.isVertical) label.classList.add("room-label-vertical");
      label.style.fontSize = labelStyle.fontPx + "px";
      el.appendChild(label);

      el.addEventListener("click", function () {
        openModal(floor, room.id);
      });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openModal(floor, room.id);
        }
      });

      canvas.appendChild(el);
    });
  }

  // Cheap refresh of just occupancy colors/titles, without rebuilding the DOM.
  function updateOccupancy(floor) {
    if (floor !== currentFloor) return;
    var canvas = document.getElementById("mapCanvas");
    var boxes = canvas.querySelectorAll(".room-box");
    boxes.forEach(function (box) {
      var roomId = box.dataset.roomId;
      var occupied = !!currentReservation(floor, roomId);
      box.classList.toggle("occupied", occupied);
      box.classList.toggle("free", !occupied);
      box.title = roomId + (occupied ? " — reserved now" : " — free now");
    });
  }

  // ---------------------------------------------------------------------
  // Floor tabs
  // ---------------------------------------------------------------------

  function setupFloorTabs() {
    var tabs = document.querySelectorAll("#floorTabs .floor-tab");
    tabs.forEach(function (tab) {
      tab.addEventListener("click", function () {
        tabs.forEach(function (t) {
          t.classList.remove("active");
        });
        tab.classList.add("active");
        renderFloor(parseInt(tab.dataset.floor, 10));
      });
    });
  }

  // ---------------------------------------------------------------------
  // Modal
  // ---------------------------------------------------------------------

  function openModal(floor, roomId) {
    currentModalRoom = { floor: floor, roomId: roomId };
    exitEditMode();

    document.getElementById("modalTitle").textContent = roomId;
    var scheduleDateEl = document.getElementById("scheduleDate");
    scheduleDateEl.min = todayStr();
    scheduleDateEl.value = todayStr();
    document.getElementById("formError").textContent = "";
    document.getElementById("reserveDuration").value = "1";

    populateReserveStartOptions();
    updateReserveFormVisibility();
    renderModalStatus();
    renderDayGrid();
    renderUpcomingList();

    document.getElementById("modalOverlay").classList.add("open");
  }

  function closeModal() {
    document.getElementById("modalOverlay").classList.remove("open");
    currentModalRoom = null;
    exitEditMode();
  }

  // Shows the reservation form (with a "Reserving as ..." line) when someone
  // is signed in, or a sign-in prompt in its place when nobody is.
  function updateReserveFormVisibility() {
    var user = getCurrentUser();
    var form = document.getElementById("reserveForm");
    var prompt = document.getElementById("signInPrompt");
    var reservingAsText = document.getElementById("reservingAsText");

    if (user) {
      form.classList.remove("hidden");
      prompt.classList.add("hidden");
      reservingAsText.textContent = "Reserving as: " + (user.name ? user.name + " " : "") + "(" + user.email + ")";
    } else {
      form.classList.add("hidden");
      prompt.classList.remove("hidden");
    }
  }

  function enterEditMode(r) {
    editingReservationId = r.id;
    document.getElementById("scheduleDate").value = r.date;
    document.getElementById("reserveDuration").value = String(r.durationHours);
    populateReserveStartOptions();
    document.getElementById("reserveStart").value = String(r.startHour);
    document.getElementById("reserveSubmitBtn").textContent = "Save changes";
    document.getElementById("cancelEditBtn").style.display = "";
    document.getElementById("formError").textContent = "";
    renderDayGrid();
  }

  function exitEditMode() {
    editingReservationId = null;
    var submitBtn = document.getElementById("reserveSubmitBtn");
    var cancelBtn = document.getElementById("cancelEditBtn");
    if (submitBtn) submitBtn.textContent = "Reserve room";
    if (cancelBtn) cancelBtn.style.display = "none";
  }

  function renderModalStatus() {
    if (!currentModalRoom) return;
    var floor = currentModalRoom.floor;
    var roomId = currentModalRoom.roomId;
    var el = document.getElementById("modalStatus");
    var res = currentReservation(floor, roomId);
    if (res) {
      el.textContent =
        "Reserved now by " + res.name + " until " + hourLabel(res.startHour + res.durationHours);
      el.className = "modal-status occupied";
    } else {
      el.textContent = "Free now";
      el.className = "modal-status free";
    }
  }

  // Populate #reserveStart with bookable hours, respecting the currently
  // selected duration so a start time can't push past CLOSE_HOUR, and (for
  // today's date) excluding hours that have already started/passed.
  function populateReserveStartOptions() {
    var durationSelect = document.getElementById("reserveDuration");
    var duration = parseInt(durationSelect.value, 10) || 1;
    var startSelect = document.getElementById("reserveStart");
    var prevValue = startSelect.value;
    var date = document.getElementById("scheduleDate").value || todayStr();

    startSelect.innerHTML = "";
    var maxStart = CLOSE_HOUR - duration;
    var minStart = earliestRelevantHour(date);
    for (var h = minStart; h <= maxStart; h++) {
      var opt = document.createElement("option");
      opt.value = String(h);
      opt.textContent = hourLabel(h);
      startSelect.appendChild(opt);
    }

    var stillValid = Array.prototype.some.call(startSelect.options, function (o) {
      return o.value === prevValue;
    });
    if (stillValid) {
      startSelect.value = prevValue;
    }
  }

  function renderDayGrid() {
    if (!currentModalRoom) return;
    var floor = currentModalRoom.floor;
    var roomId = currentModalRoom.roomId;
    var date = document.getElementById("scheduleDate").value || todayStr();

    var grid = document.getElementById("dayGrid");
    grid.innerHTML = "";

    var reservations = getReservationsFor(floor, roomId, date);

    var minHour = earliestRelevantHour(date);
    for (var h = minHour; h < CLOSE_HOUR; h++) {
      (function (hour) {
        var row = document.createElement("div");
        row.className = "day-grid-row";

        var timeCell = document.createElement("div");
        timeCell.className = "day-grid-time";
        timeCell.textContent = timeRangeLabel(hour, 1);
        row.appendChild(timeCell);

        var statusCell = document.createElement("div");
        statusCell.className = "day-grid-status";

        var res = reservations.find(function (r) {
          return hour >= r.startHour && hour < r.startHour + r.durationHours;
        });

        if (res) {
          statusCell.textContent = "Reserved by " + res.name;
          statusCell.classList.add("booked");
        } else {
          statusCell.textContent = "Free";
          statusCell.classList.add("free");
          row.classList.add("clickable");
          row.addEventListener("click", function () {
            var startSelect = document.getElementById("reserveStart");
            var hasOption = Array.prototype.some.call(startSelect.options, function (o) {
              return o.value === String(hour);
            });
            if (!hasOption) {
              // Current duration would run past closing from this hour;
              // fall back to a 1-hour duration so this slot is selectable.
              document.getElementById("reserveDuration").value = "1";
              populateReserveStartOptions();
            }
            startSelect.value = String(hour);
          });
        }

        row.appendChild(statusCell);
        grid.appendChild(row);
      })(h);
    }
  }

  function renderUpcomingList() {
    if (!currentModalRoom) return;
    var floor = currentModalRoom.floor;
    var roomId = currentModalRoom.roomId;
    var today = todayStr();

    var list = document.getElementById("upcomingList");
    list.innerHTML = "";

    var upcoming = reservationsCache
      .filter(function (r) {
        return r.floor === floor && r.roomId === roomId && r.date >= today && isReservationUpcoming(r);
      })
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.startHour - b.startHour;
      });

    if (upcoming.length === 0) {
      var empty = document.createElement("li");
      empty.className = "upcoming-empty";
      empty.textContent = reservationsLoaded ? "No upcoming reservations." : "Loading…";
      list.appendChild(empty);
      return;
    }

    var user = getCurrentUser();

    upcoming.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "upcoming-item";

      var info = document.createElement("span");
      info.textContent = r.date + " · " + timeRangeLabel(r.startHour, r.durationHours) + " · Reserved by " + r.name;
      li.appendChild(info);

      // Other people's bookings stay visible (so everyone can see the room is
      // taken) but are read-only — only the reservation's own signed-in owner
      // (matched by verified email) gets Edit/Cancel controls. This is a UI
      // nicety only; Postgres RLS is what actually enforces it server-side
      // even if someone tampered with this check in devtools.
      if (user && user.email === r.email) {
        var actions = document.createElement("span");
        actions.className = "upcoming-actions";

        var editBtn = document.createElement("button");
        editBtn.type = "button";
        editBtn.className = "btn-edit";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", function () {
          enterEditMode(r);
        });
        actions.appendChild(editBtn);

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-cancel";
        btn.textContent = "Cancel";
        btn.addEventListener("click", function () {
          if (!window.confirm("Cancel this reservation for " + roomId + " on " + r.date + "?")) return;
          btn.disabled = true;
          deleteReservation(r.id).then(function (result) {
            if (result.error) {
              btn.disabled = false;
              window.alert("Could not cancel this reservation: " + result.error.message);
              return;
            }
            if (editingReservationId === r.id) exitEditMode();
            reloadAndRender();
          });
        });
        actions.appendChild(btn);

        li.appendChild(actions);
      }

      list.appendChild(li);
    });
  }

  function handleReserveSubmit(e) {
    e.preventDefault();
    if (!currentModalRoom) return;

    var floor = currentModalRoom.floor;
    var roomId = currentModalRoom.roomId;
    var errorEl = document.getElementById("formError");
    errorEl.textContent = "";

    var user = getCurrentUser();
    if (!user) {
      errorEl.textContent = "Please sign in with Google (top of page) to reserve this room.";
      return;
    }

    var date = document.getElementById("scheduleDate").value || todayStr();
    var startHour = parseInt(document.getElementById("reserveStart").value, 10);
    var duration = parseInt(document.getElementById("reserveDuration").value, 10);

    if (Number.isNaN(startHour) || Number.isNaN(duration)) {
      errorEl.textContent = "Please choose a valid start time and duration.";
      return;
    }

    if (startHour + duration > CLOSE_HOUR) {
      errorEl.textContent = "That duration extends past closing time (" + hourLabel(CLOSE_HOUR) + ").";
      return;
    }

    // Defensive re-check: the date input's `min` and the start-time
    // select's options already keep the UI from offering a past date/time,
    // but guard here too in case either was bypassed. The database's own
    // starts_not_in_past constraint (supabase/schema.sql) is the real
    // backstop that can't be bypassed at all.
    var today = todayStr();
    if (date < today) {
      errorEl.textContent = "You can't reserve a date in the past.";
      return;
    }
    if (date === today && startHour < new Date().getHours()) {
      errorEl.textContent = "That start time has already passed today.";
      return;
    }

    // Fast client-side pre-checks, for a specific error message naming the
    // conflicting room/time. These are just a UX nicety — the database's own
    // EXCLUDE constraints are the real backstop (see the .catch-equivalent
    // error handling below), so a conflict that slips past this check (e.g.
    // a race with another request) is still rejected server-side.
    if (hasConflict(floor, roomId, date, startHour, duration, editingReservationId)) {
      errorEl.textContent = "That time conflicts with an existing reservation for this room. Please choose another time.";
      return;
    }

    var crossConflict = hasCrossRoomConflict(user.email, date, startHour, duration, editingReservationId);
    if (crossConflict) {
      errorEl.textContent =
        "You already have " + crossConflict.roomId + " booked " +
        timeRangeLabel(crossConflict.startHour, crossConflict.durationHours) +
        " that day, which overlaps this request.";
      return;
    }

    var payload = {
      floor: floor,
      room_id: roomId,
      reservation_date: date,
      start_hour: startHour,
      duration_hours: duration,
      email: user.email,
      name: user.name,
    };

    var submitBtn = document.getElementById("reserveSubmitBtn");
    var wasEditing = editingReservationId;
    submitBtn.disabled = true;
    errorEl.textContent = "Saving…";

    var request = wasEditing
      ? updateReservation(wasEditing, payload)
      : createReservation(payload);

    request.then(function (result) {
      submitBtn.disabled = false;

      if (result.error) {
        if (isExclusionViolation(result.error)) {
          // The client-side pre-check above missed this — most likely
          // someone else's request landed in the moment between our check
          // and our insert/update. The database rejected it for real; make
          // sure the UI reflects the up-to-date state rather than looking
          // like the save silently worked.
          errorEl.textContent =
            "That time is no longer available — it was just booked. Please pick another time.";
        } else {
          errorEl.textContent = "Could not save this reservation: " + result.error.message;
        }
        reloadAndRender();
        return;
      }

      exitEditMode();
      errorEl.textContent = "";
      document.getElementById("reserveDuration").value = "1";
      populateReserveStartOptions();

      reloadAndRender();
    });
  }

  function setupModalHandlers() {
    document.getElementById("modalClose").addEventListener("click", closeModal);

    document.getElementById("modalOverlay").addEventListener("click", function (e) {
      if (e.target.id === "modalOverlay") closeModal();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && document.getElementById("modalOverlay").classList.contains("open")) {
        closeModal();
      }
    });

    document.getElementById("scheduleDate").addEventListener("change", function () {
      var dateEl = document.getElementById("scheduleDate");
      var today = todayStr();
      // Defensive clamp: the `min` attribute stops the date picker UI from
      // navigating to a past date, but a value could still be set another
      // way (typed directly, autofill, devtools), so reject that here too.
      if (dateEl.value && dateEl.value < today) {
        dateEl.value = today;
      }
      populateReserveStartOptions();
      renderDayGrid();
    });

    document.getElementById("reserveDuration").addEventListener("change", function () {
      populateReserveStartOptions();
    });

    document.getElementById("reserveForm").addEventListener("submit", handleReserveSubmit);

    document.getElementById("cancelEditBtn").addEventListener("click", function () {
      exitEditMode();
      document.getElementById("formError").textContent = "";
    });

    document.getElementById("googleSignInButton").addEventListener("click", signIn);
    document.getElementById("signOutBtn").addEventListener("click", signOut);

    var welcomeSignInBtn = document.getElementById("welcomeSignInButton");
    if (welcomeSignInBtn) welcomeSignInBtn.addEventListener("click", signIn);
  }

  // ---------------------------------------------------------------------
  // Live refresh
  // ---------------------------------------------------------------------

  // Recomputes occupancy from the in-memory cache as time passes (e.g. a
  // booking that started at 2pm should flip a room to "occupied" at 2pm even
  // if no database row changed). Data changes themselves are picked up by
  // the Realtime subscription (or its polling fallback) set up in init().
  function tick() {
    updateOccupancy(currentFloor);
    if (currentModalRoom) {
      renderModalStatus();
    }
  }

  // ---------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------

  function init() {
    setupFloorTabs();
    setupModalHandlers();
    setupAuth();
    var scheduleDateEl = document.getElementById("scheduleDate");
    if (scheduleDateEl) scheduleDateEl.min = todayStr();
    renderFloor(currentFloor);
    setInterval(tick, REFRESH_INTERVAL_MS);

    refreshReservationsCache().then(function () {
      renderFloor(currentFloor);
      if (currentModalRoom) {
        renderDayGrid();
        renderUpcomingList();
        renderModalStatus();
      }
    });
    setupRealtime();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
