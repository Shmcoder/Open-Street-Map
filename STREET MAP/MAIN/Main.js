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
    const circle = L.circle([lat, lng], { ...options, radius }).addTo(this.map);
    const centerMarker = L.marker([lat, lng], { draggable: true }).addTo(
      this.map
    );

    centerMarker.on("dragend", () =>
      this.onCircleDragEnd(circle, centerMarker)
    );
    return circle;
  }

  onCircleDragEnd(circle, marker) {
    const newLatLng = marker.getLatLng();
    circle.setLatLng(newLatLng);
    const shape = this.shapes.find((s) => s.obj === circle);
    if (shape) {
      shape.lat = newLatLng.lat;
      shape.lng = newLatLng.lng;
    }
  }

  createPolygon(type, coords, options) {
    const polygon = L.polygon(coords, options).addTo(this.map);
    const markers = coords.map((coord) => {
      const marker = L.marker(coord, { draggable: true }).addTo(this.map);
      marker.on("dragend", () => this.onDragEnd(polygon, markers));
      return marker;
    });

    // Store markers in the shape object
    this.shapes.push({ type, coords, obj: polygon, markers });
    return polygon;
  }

  onDragEnd(polygon, markers) {
    const newCoords = markers.map((marker) => marker.getLatLng());
    polygon.setLatLngs(newCoords);

    const bounds = L.latLngBounds(newCoords);
    this.map.fitBounds(bounds);

    const shape = this.shapes.find((s) => s.obj === polygon);
    if (shape) {
      shape.coords = newCoords;
    }
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
      const shapeType = type.charAt(0).toUpperCase() + type.slice(1);
      const coordinatesStr = sizeOrCoords
        .map((coord) => `${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}`)
        .join("<br>");
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
          shape.obj.setRadius(newRadius);
          shape.obj.setLatLng([lat, lng]);
          shape.lat = lat;
          shape.lng = lng;
          shape.obj
            .bindPopup(
              this.getPopupContent(type, shape.lat, shape.lng, newRadius)
            )
            .openPopup();
        }
      } else {
        const bounds = L.latLngBounds(shape.coords);
        this.map.fitBounds(bounds);
        shape.markers.forEach((marker) => {
          marker.dragging.enable();
          marker.on("dragend", () => this.onDragEnd(shape.obj, shape.markers));
        });

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
      if (shape.type === type) {
        if (type === "circle" && shape.lat === lat && shape.lng === lng) {
          // Remove circle and its associated marker
          this.map.removeLayer(shape.obj);
          shape.obj.unbindPopup();
          return false;
        } else if (type !== "circle") {
          // For polygons, check if the clicked point is within the polygon bounds
          const point = L.latLng(lat, lng);
          if (shape.obj.getBounds().contains(point)) {
            // Remove polygon and its associated markers
            this.map.removeLayer(shape.obj);
            shape.markers.forEach((marker) => this.map.removeLayer(marker));
            return false;
          }
        }
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
