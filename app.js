// Elgin Campus Room Reservations — app logic (vanilla JS, no build step, no CDN deps).
(function () {
  "use strict";

  var STORAGE_KEY = "atc-room-reservations";
  var LAST_NAME_KEY = "atc-last-name";
  var REFRESH_INTERVAL_MS = 30000;

  var currentFloor = 3;
  var currentModalRoom = null; // { floor, roomId }

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

    document.getElementById("modalTitle").textContent = roomId;
    document.getElementById("scheduleDate").value = todayStr();
    document.getElementById("formError").textContent = "";

    var lastName = localStorage.getItem(LAST_NAME_KEY) || "";
    document.getElementById("reserveName").value = lastName;
    document.getElementById("reserveDuration").value = "1";

    populateReserveStartOptions();
    renderModalStatus();
    renderDayGrid();
    renderUpcomingList();

    document.getElementById("modalOverlay").classList.add("open");
  }

  function closeModal() {
    document.getElementById("modalOverlay").classList.remove("open");
    currentModalRoom = null;
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
          statusCell.textContent = res.name;
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
            document.getElementById("reserveName").focus();
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

    upcoming.forEach(function (r) {
      var li = document.createElement("li");
      li.className = "upcoming-item";

      var info = document.createElement("span");
      info.textContent = r.date + " · " + timeRangeLabel(r.startHour, r.durationHours) + " · " + r.name;
      li.appendChild(info);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-cancel";
      btn.textContent = "Cancel";
      btn.addEventListener("click", function () {
        if (window.confirm("Cancel this reservation for " + roomId + " on " + r.date + "?")) {
          cancelReservationById(r.id);
          renderDayGrid();
          renderUpcomingList();
          renderModalStatus();
          updateOccupancy(currentFloor);
        }
      });
      li.appendChild(btn);

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

    var nameInput = document.getElementById("reserveName");
    var name = nameInput.value.trim();
    if (!name) {
      errorEl.textContent = "Please enter your name.";
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

    if (hasConflict(floor, roomId, date, startHour, duration)) {
      errorEl.textContent = "That time conflicts with an existing reservation for this room. Please choose another time.";
      return;
    }

    addReservation({
      id: makeId(),
      floor: floor,
      roomId: roomId,
      date: date,
      startHour: startHour,
      durationHours: duration,
      name: name,
    });

    localStorage.setItem(LAST_NAME_KEY, name);

    errorEl.textContent = "";
    document.getElementById("reserveDuration").value = "1";
    populateReserveStartOptions();
    nameInput.value = name; // keep last-used name prefilled

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
    setInterval(tick, REFRESH_INTERVAL_MS);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
