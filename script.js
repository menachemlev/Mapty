'use strict';

// prettier-ignore
const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');
const showAllBtn = document.querySelector('#showAll');
let MAP;


class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10);
  marker;
  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    //prettier-ignore
    const months = ["January","February","March","April","May","June","July",
    "August","September","October","November","December"];
    this.description = `${this.type.toUpperCase()} on ${this.date.getDate()},${
      months[this.date.getMonth()]
    }`;
  }
}

class Running extends Workout {
  type = 'running';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this._setDescription();
    this._calcPace();
  }
  _calcPace() {
    this.pace = this.distance / (this.duration / 60);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this._setDescription();
    this._calcSpeed();
  }
  _calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

class App {
  #map;
  #mapE;
  #workouts = [];
  #mapZoom = 15;
  #maxZoom = this.#mapZoom;
  constructor() {
    this._getPosition();
    this._getLocalStorage();
    form.addEventListener('submit', this._newWorkout.bind(this));
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));
    inputType.addEventListener('change', this._toggleElevationField.bind(this));
    showAllBtn.addEventListener('click', this._showAllWorkouts.bind(this));
  }
  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }
  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];
    this.#map =MAP = L.map('map').setView(coords, this.#mapZoom);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => this._renderWorkoutMarker(work));
    this._setLocalStorage();
  }

  _showForm(mapE) {
    this.#mapE = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }
  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }
  _newWorkout(e) {
    const inputValid = (...inputs) => {
      return inputs.every(input => {
        Number.isFinite(input);
      });
    };

    const inputPositive = (...inputs) => {
      return inputs.every(input => {
        input > 0;
      });
    };

    e.preventDefault();
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapE.latlng;
    const coords = [lat, lng];
    let Workout;
	showAllBtn.style.display="inline-block";
console.log(showAllBtn);
    if (type === 'running') {
      const cadence = +inputCadence.value;
      /* if (
        !inputValid(distance, duration, cadence) ||
        !inputPositive(distance, duration, cadence)
      )
      return alert('Inputs have to be positive numbers!');*/

      Workout = new Running(coords, distance, duration, cadence);
    }
    if (type === 'cycling') {
      const elevation = +inputElevation.value;
      console.log(distance, duration, elevation);
      /* if (
        !inputValid(distance, duration, elevation) ||
        !inputPositive(distance, duration)
      )
      return alert('Inputs have to be positive numbers!');*/

      Workout = new Cycling(coords, distance, duration, elevation);
    }
    this.#workouts.push(Workout);
    this._renderWorkoutMarker(Workout);
    this._renderWorkout(Workout);
    //Hide form + clear input
    this._setLocalStorage();
  }
  _renderWorkoutMarker(workout) {
    workout.marker = L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type == 'running' ? '🏃‍♂️' : '🤦‍♂️'} ${
          workout.description
        }<b data-id="${workout.id}"></b>`
      )
      .openPopup();

    //aading remove event
    [...document.querySelectorAll('b')]
      .filter(b => b.dataset.id === workout.id)[0]
      .closest('.leaflet-popup')
      .querySelector('.leaflet-popup-close-button')
      .addEventListener('click', this._removeWorkout.bind(this, workout.id));
  }

  _renderWorkout(workout) {
    let html = `<li class="workout workout--${workout.type}" data-id="${
      workout.id
    }">
    <h2 class="workout__title">${workout.description}</h2>
    <div class="workout__details">
      <span class="workout__icon">${
        workout.type == 'running' ? '🏃‍♂️' : '🤦‍♂️'
      }</span>
      <span class="workout__value">${workout.distance}</span>
      <span class="workout__unit">km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">min</span>
    </div>`;

    if (workout.type === 'running') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.pace.toFixed(1)}</span>
      <span class="workout__unit">min/km</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">🦶🏼</span>
      <span class="workout__value">${workout.duration}</span>
      <span class="workout__unit">spm</span>
    </div>`;
    }
    if (workout.type === 'cycling') {
      html += ` <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${workout.speed}</span>
      <span class="workout__unit">km/h</span>
    </div>
    <div class="workout__details">
      <span class="workout__icon">⛰</span>
      <span class="workout__value">${workout.elevation}</span>
      <span class="workout__unit">m</span>`;
    }

    form.insertAdjacentHTML('afterend', html);
    this._hideForm();
  }
  _hideForm() {
    inputCadence.value =
      inputDistance.value =
      inputDuration.value =
      inputElevation.value =
        '';
    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    console.log(workout);

    this.#map.setView(workout.coords, this.#mapZoom, {
      animate: true,
      pan: { duration: 1 },
    });
  }
  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
    localStorage.setItem('maxZoom', this.#maxZoom);
  }
  _getLocalStorage() {
    if (!localStorage.workouts) return;
    const data = JSON.parse(localStorage.workouts);
    if (!data) return;
    this.#workouts = data;

    if (!localStorage.maxZoom) return;
    this.#maxZoom = localStorage.maxZoom;

    this.#workouts.forEach(work => this._renderWorkout(work));
  }

  _removeWorkout(id) {
    //getting workout
    const workout = this.#workouts.reduce((final, workout) => {
      if (id === workout.id) return workout;
      return final;
    }, null);

    //removing marker
    this.#map.removeLayer(workout.marker);

    //removing rendered workout
    [...document.querySelectorAll('.workout')]
      .reduce((final, elem) => {
        if (id === elem.dataset.id) return elem;
        return final;
      }, null)
      .remove();

    //removing workout from array
    this.#workouts = this.#workouts.filter(wo => {
      return wo.id !== id;
    });
    //changing local storage
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
	
	if(this.#workouts.length===0){
		showAllBtn.style.display="none";
	}
		
	
  }

  _showAllWorkouts() {
    //getting middle location
    let middleCoords = [0, 0];
    this.#workouts.forEach(workout => {
      middleCoords[0] += workout.coords[0];
      middleCoords[1] += workout.coords[1];
    });
    middleCoords[0] /= this.#workouts.length;
    middleCoords[1] /= this.#workouts.length;

	
	
    //Finding the farest workout from the middle
    let farest = 0;
    this.#workouts.forEach(workout => {
      const length = Math.sqrt(
        (middleCoords[0] - workout.coords[0]) ** 2 +
          (middleCoords[1] - workout.coords[1]) ** 2
      );
      if (length > farest) farest = length;
    });
    console.log(farest);
    farest = farest / 0.01;
    console.log(farest);
    this.#map.setView(middleCoords, this.#mapZoom-0.5 - Math.log2(farest));
  }
}

const app = new App();

/*
let leftestCoords, rightestCoords, northestCoords, southestCoords;
    leftestCoords =
      rightestCoords =
      northestCoords =
      southestCoords =
        this.#workouts[0].coords;
    this.#workouts.forEach(workout => {
      const coords = workout.coords;
      //leftest
      if (coords[0] < leftestCoords[0]) leftestCoords = coords;
      //rightest
      if (coords[0] > rightestCoords[0]) rightestCoords = coords;
      //topest
      if (coords[1] > northestCoords[1]) northestCoords = coords;
      //bottom
      if (coords[1] < northestCoords[1]) southestCoords = coords;
    });

    const width = rightestCoords[0] - leftestCoords[0];
    const height = northestCoords[1] - southestCoords[1];

    console.log(
      rightestCoords,
      leftestCoords,
      northestCoords,
      southestCoords,
      width,
      height
    );*/
    
    
    
    
//Removing ad
const divsArray = [...document.querySelectorAll("div")];
const lastDiv = divsArray[divsArray.length - 1];
console.log(lastDiv);
lastDiv.style.width = "0";
lastDiv.style.height = "0";
lastDiv.style.opacity = "0";
