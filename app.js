// Elgin Campus Room Reservations — app logic (vanilla JS, no build step, no CDN deps).
(function () {
  "use strict";

  var STORAGE_KEY = "atc-room-reservations";
  var AUTH_STORAGE_KEY = "atc-current-user";
  var REFRESH_INTERVAL_MS = 30000;

  var currentFloor = 3;
  var currentModalRoom = null; // { floor, roomId }
  var editingReservationId = null; // non-null while the reserve form is in "edit" mode

  // ---------------------------------------------------------------------
  // Storage helpers
  // ---------------------------------------------------------------------

  function loadReservations() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function saveReservations(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  function addReservation(reservation) {
    var list = loadReservations();
    list.push(reservation);
    saveReservations(list);
  }

  function cancelReservationById(id) {
    var list = loadReservations().filter(function (r) {
      return r.id !== id;
    });
    saveReservations(list);
  }

  function updateReservationById(id, patch) {
    var list = loadReservations();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) {
        list[i] = Object.assign({}, list[i], patch);
        break;
      }
    }
    saveReservations(list);
  }

  function makeId() {
    return (
      "res_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 9)
    );
  }

  function getReservationsFor(floor, roomId, date) {
    return loadReservations().filter(function (r) {
      return r.floor === floor && r.roomId === roomId && r.date === date;
    });
  }

  function hasConflict(floor, roomId, date, startHour, durationHours, excludeId) {
    var proposedEnd = startHour + durationHours;
    return loadReservations().some(function (r) {
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
  function hasCrossRoomConflict(email, date, startHour, durationHours, excludeId) {
    var proposedEnd = startHour + durationHours;
    var list = loadReservations();
    for (var i = 0; i < list.length; i++) {
      var r = list[i];
      if (excludeId && r.id === excludeId) continue;
      if (r.email !== email || r.date !== date) continue;
      var existingEnd = r.startHour + r.durationHours;
      if (startHour < existingEnd && r.startHour < proposedEnd) {
        return r;
      }
    }
    return null;
  }

  // ---------------------------------------------------------------------
  // Auth (Google Identity Services)
  // ---------------------------------------------------------------------

  function getCurrentUser() {
    try {
      var raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function setCurrentUser(user) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    refreshAuthUI();
  }

  function clearCurrentUser() {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    refreshAuthUI();
  }

  // Decodes (but does NOT cryptographically verify) a Google Identity Services
  // JWT payload. Real verification would require fetching Google's JWKS and
  // checking the signature with Web Crypto — out of scope for this client-only
  // POC. Acceptable for this POC's trust model; a real deployment needs a
  // backend to verify the token before trusting its claims.
  function decodeJwtPayload(token) {
    try {
      var parts = token.split(".");
      if (parts.length < 2) return null;
      var base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      while (base64.length % 4) base64 += "=";
      var json = decodeURIComponent(
        atob(base64)
          .split("")
          .map(function (c) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
      return JSON.parse(json);
    } catch (e) {
      return null;
    }
  }

  function handleCredentialResponse(response) {
    var payload = decodeJwtPayload(response && response.credential);
    if (!payload || !payload.email) return;
    setCurrentUser({ email: payload.email, name: payload.name || payload.email });
  }

  function tryInitGoogleSignIn() {
    if (!window.google || !google.accounts || !google.accounts.id) return false;
    try {
      google.accounts.id.initialize({
        client_id: typeof GOOGLE_CLIENT_ID !== "undefined" ? GOOGLE_CLIENT_ID : "",
        callback: handleCredentialResponse,
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function tryRenderGoogleButton() {
    var container = document.getElementById("googleSignInButton");
    if (!container) return;
    container.innerHTML = "";
    if (!window.google || !google.accounts || !google.accounts.id) return;
    try {
      google.accounts.id.renderButton(container, { theme: "outline", size: "medium" });
    } catch (e) {
      // GIS unavailable (no real Client ID / no network path to Google in this
      // environment) — expected in dev/test; the rest of the page still works.
    }
  }

  function renderAuthArea() {
    var user = getCurrentUser();
    var btnContainer = document.getElementById("googleSignInButton");
    var infoEl = document.getElementById("signedInInfo");
    var nameEl = document.getElementById("signedInName");

    if (user) {
      if (btnContainer) btnContainer.style.display = "none";
      if (infoEl) infoEl.style.display = "flex";
      if (nameEl) nameEl.textContent = (user.name ? user.name + " " : "") + "(" + user.email + ")";
    } else {
      if (infoEl) infoEl.style.display = "none";
      if (btnContainer) btnContainer.style.display = "";
      tryRenderGoogleButton();
    }
  }

  // Re-renders everything whose content depends on who is currently signed in.
  function refreshAuthUI() {
    renderAuthArea();
    if (currentModalRoom) {
      exitEditMode();
      updateReserveFormVisibility();
      renderUpcomingList();
    }
  }

  // TEST-ONLY HOOK: lets automated tests (and manual debugging) sign in as a
  // fake identity without going through real Google OAuth, since headless
  // browsers can't complete Google's sign-in flow and no real Client ID is
  // configured yet. Not wired to any visible UI control.
  window.__setTestUser = function (email, name) {
    setCurrentUser({ email: String(email), name: name ? String(name) : String(email) });
  };

  // Same test-only escape hatch, reachable via a query string for convenience
  // in scripted/headless runs, e.g. ?testUser=a@example.com&testName=Alice
  function applyTestUserFromQuery() {
    try {
      var params = new URLSearchParams(window.location.search);
      var email = params.get("testUser");
      if (email) {
        window.__setTestUser(email, params.get("testName") || email);
      }
    } catch (e) {
      // ignore
    }
  }

  // Invoked by the GIS <script onload> in index.html once the real Google
  // script has finished loading (it's loaded async, so it may arrive after
  // this file has already run its initial setup).
  window.__gisLoaded = function () {
    tryInitGoogleSignIn();
    renderAuthArea();
  };

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

  function renderFloor(floor) {
    currentFloor = floor;
    var data = FLOORS[floor];
    if (!data) return;

    var floorTitleEl = document.getElementById("floorTitle");
    floorTitleEl.textContent = data.title;

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
    document.getElementById("scheduleDate").value = todayStr();
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
  // selected duration so a start time can't push past CLOSE_HOUR.
  function populateReserveStartOptions() {
    var durationSelect = document.getElementById("reserveDuration");
    var duration = parseInt(durationSelect.value, 10) || 1;
    var startSelect = document.getElementById("reserveStart");
    var prevValue = startSelect.value;

    startSelect.innerHTML = "";
    var maxStart = CLOSE_HOUR - duration;
    for (var h = OPEN_HOUR; h <= maxStart; h++) {
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

    for (var h = OPEN_HOUR; h < CLOSE_HOUR; h++) {
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

    var upcoming = loadReservations()
      .filter(function (r) {
        return r.floor === floor && r.roomId === roomId && r.date >= today;
      })
      .sort(function (a, b) {
        if (a.date !== b.date) return a.date < b.date ? -1 : 1;
        return a.startHour - b.startHour;
      });

    if (upcoming.length === 0) {
      var empty = document.createElement("li");
      empty.className = "upcoming-empty";
      empty.textContent = "No upcoming reservations.";
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
      // (matched by verified email) gets Edit/Cancel controls.
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
          if (window.confirm("Cancel this reservation for " + roomId + " on " + r.date + "?")) {
            if (editingReservationId === r.id) exitEditMode();
            cancelReservationById(r.id);
            renderDayGrid();
            renderUpcomingList();
            renderModalStatus();
            updateOccupancy(currentFloor);
          }
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

    if (editingReservationId) {
      updateReservationById(editingReservationId, {
        date: date,
        startHour: startHour,
        durationHours: duration,
        email: user.email,
        name: user.name,
      });
    } else {
      addReservation({
        id: makeId(),
        floor: floor,
        roomId: roomId,
        date: date,
        startHour: startHour,
        durationHours: duration,
        email: user.email,
        name: user.name,
      });
    }

    exitEditMode();
    errorEl.textContent = "";
    document.getElementById("reserveDuration").value = "1";
    populateReserveStartOptions();

    renderDayGrid();
    renderUpcomingList();
    renderModalStatus();
    updateOccupancy(currentFloor);
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

    document.getElementById("signOutBtn").addEventListener("click", function () {
      clearCurrentUser();
      if (window.google && google.accounts && google.accounts.id) {
        try {
          google.accounts.id.disableAutoSelect();
        } catch (e) {
          // ignore — GIS may not be loaded in this environment
        }
      }
    });
  }

  // ---------------------------------------------------------------------
  // Live refresh
  // ---------------------------------------------------------------------

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
    renderFloor(currentFloor);
    tryInitGoogleSignIn();
    renderAuthArea();
    applyTestUserFromQuery();
    setInterval(tick, REFRESH_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
