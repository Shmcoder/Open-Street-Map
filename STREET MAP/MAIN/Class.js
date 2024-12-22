class ShapeManager {
  constructor(mapContainerId) {
    this.map = L.map(mapContainerId).setView([11.0168, 76.9558], 5);
    this.shapes = [];
    this.currentShape = null;
    this.circleColor = "green";
    this.triangleColor = "red";
    this.rectangleColor = "blue";
    this.coordinates = [];

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.map);

    this.map.on("click", this.onMapClick.bind(this));
  }

  onMapClick(event) {
    if (!this.currentShape) {
      console.log("No shape selected");
      return;
    }

    const { lat, lng } = event.latlng;
    switch (this.currentShape) {
      case "circle":
        this.handleCircleClick(lat, lng);
        break;
      case "triangle":
      case "rectangle":
        this.handlePolygonClick(
          lat,
          lng,
          this.currentShape === "triangle" ? 3 : 4
        );
        break;
    }
  }

  handleCircleClick(lat, lng) {
    if (this.coordinates.length === 0) {
      const radius = this.getDimension();
      if (radius !== null) {
        const zoomLevel = this.calculateZoomLevel(radius);
        this.map.flyTo([lat, lng], zoomLevel);
        this.drawShape("circle", lat, lng, radius);
      }
    }
  }

  handlePolygonClick(lat, lng, pointsRequired) {
    this.coordinates.push([lat, lng]);

    if (this.coordinates.length === pointsRequired) {
      const bounds = L.latLngBounds(this.coordinates);
      this.map.fitBounds(bounds);
      this.drawShape(this.currentShape, null, null, this.coordinates);
      this.coordinates = [];
    }
  }

  getDimension() {
    const input = prompt("Enter radius in meters:", 200);
    const dimension = parseFloat(input);
    return isNaN(dimension) ? (alert("Invalid input."), null) : dimension;
  }

  setCurrentShape(shapeType) {
    this.currentShape = shapeType;
    this.coordinates = [];
    console.log(`${shapeType} selected`);
  }

  drawShape(type, lat, lng, sizeOrCoords) {
    const shape = this.createShape(type, lat, lng, sizeOrCoords);
    if (shape) {
      this.shapes.push({ type, lat, lng, obj: shape });
      shape
        .bindPopup(this.getPopupContent(type, lat, lng, sizeOrCoords))
        .openPopup();
    }
  }

  createShape(type, lat, lng, sizeOrCoords) {
    const options = {
      color:
        type === "circle"
          ? this.circleColor
          : type === "triangle"
          ? this.triangleColor
          : this.rectangleColor,
    };

    const points = {
      circle: () => this.createCircle(lat, lng, sizeOrCoords, options),
      triangle: () => this.createPolygon("triangle", sizeOrCoords, options),
      rectangle: () => this.createPolygon("rectangle", sizeOrCoords, options),
    };

    return points[type] ? points[type]() : null;
  }

  createCircle(lat, lng, radius, options) {
    return L.circle([lat, lng], { ...options, radius }).addTo(this.map);
  }

  createPolygon(type, coords, options) {
    return L.polygon(coords, options).addTo(this.map);
  }

  calculateZoomLevel(radius) {
    if (radius <= 500) return 15;
    if (radius <= 2000) return 12;
    if (radius <= 5000) return 10;
    return 8;
  }

  getPopupContent(type, lat, lng, sizeOrCoords) {
    if (type === "circle") {
      return `
        <b>Circle Information</b><br>
        <b>Radius:</b> ${sizeOrCoords} m<br>
        <b>Location:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
        <button onclick="shapeManager.editShape('${type}', ${lat}, ${lng})">Edit</button>
        <button onclick="shapeManager.removeShape('${type}', ${lat}, ${lng})">Remove</button>
      `;
    } else {
      const shapeType = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize the first letter
      const coordinatesStr = sizeOrCoords
        .map((coord) => `${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`)
        .join("<br>"); // Dynamically show the coordinates

      return `
        <b>${shapeType} Information</b><br>
        <b>Coordinates:</b><br>
        ${coordinatesStr}<br>
        <button onclick="shapeManager.removeShape('${type}', ${lat}, ${lng})">Remove</button>
      `;
    }
  }

  editShape(type, lat, lng) {
    const shape = this.shapes.find(
      (s) => s.type === type && s.lat === lat && s.lng === lng
    );

    if (shape) {
      if (type === "circle") {
        const newRadius = parseFloat(
          prompt("Enter new radius in meters:", shape.obj.getRadius())
        );
        if (!isNaN(newRadius)) {
          shape.obj.setRadius(newRadius); // Update radius
          shape.obj.setLatLng([lat, lng]); // Ensure the circle center is correct
          shape.lat = lat; // Update circle's center latitude
          shape.lng = lng; // Update circle's center longitude

          // Recalculate the zoom level based on new radius
          const zoomLevel = this.calculateZoomLevel(newRadius);

          // Fly to the updated circle's location with the new zoom level
          this.map.flyTo([lat, lng], zoomLevel);

          // Update the popup with the new radius
          shape.obj
            .bindPopup(
              this.getPopupContent(type, shape.lat, shape.lng, newRadius)
            )
            .openPopup();
        }
      } else {
        const bounds = L.latLngBounds(shape.coords);
        this.map.fitBounds(bounds); // Adjust the map view to fit the polygon

        // Update the coordinates dynamically and bind the popup again
        shape.obj.setLatLngs(shape.coords);
        shape.obj
          .bindPopup(
            this.getPopupContent(type, shape.lat, shape.lng, shape.coords)
          )
          .openPopup();
      }
    }
  }

  removeShape(type, lat, lng) {
    this.shapes = this.shapes.filter((shape) => {
      if (shape.type === type && shape.lat === lat && shape.lng === lng) {
        this.map.removeLayer(shape.obj);
        return false;
      }
      return true;
    });
  }
}

// Usage
const shapeManager = new ShapeManager("map");
document.getElementById("circle-btn").onclick = () =>
  shapeManager.setCurrentShape("circle");
document.getElementById("triangle-btn").onclick = () =>
  shapeManager.setCurrentShape("triangle");
document.getElementById("rectangle-btn").onclick = () =>
  shapeManager.setCurrentShape("rectangle");
