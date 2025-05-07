"use strict";
class DisposalTicketForm {
    constructor() {
        this.form = document.querySelector('.ticket-container');
        this.formData = this.initializeFormData();
        this.initializeSignaturePad();
        this.attachEventListeners();
        this.requestGeolocation();
        this.setDefaultDateTime();
    }
    initializeFormData() {
        return {
            date: '',
            time: '',
            driverName: '',
            truckingCompany: '',
            truckNumber: '',
            workTicketNumber: '',
            field: '',
            operator: '',
            leaseName: '',
            county: '',
            rrcNumber: '',
            totalBbls: 0,
            saltWater: false,
            flowBack: false,
            other: false,
            stockTank: false,
            fracTank: false,
            pit: false,
            signature: '',
            latitude: undefined,
            longitude: undefined
        };
    }
    setDefaultDateTime() {
        const now = new Date();
        // Set default date
        const dateInput = this.form.querySelector('#date');
        const formattedDate = now.toISOString().split('T')[0];
        dateInput.value = formattedDate;
        this.formData.date = formattedDate;
        // Set default time
        const timeInput = this.form.querySelector('#time');
        const hours = now.getHours();
        const minutes = now.getMinutes();
        const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        timeInput.value = formattedTime;
        this.formData.time = formattedTime;
        this.saveToLocalStorage();
    }
    requestGeolocation() {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.formData.latitude = position.coords.latitude;
                this.formData.longitude = position.coords.longitude;
                this.updateCoordinatesDisplay();
                this.saveToLocalStorage();
            }, (error) => {
                console.warn('Geolocation error:', error.message);
                const coordsDisplay = document.getElementById('coordinates-display');
                if (coordsDisplay) {
                    coordsDisplay.textContent = 'Location unavailable';
                }
            }, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        }
        else {
            console.warn('Geolocation is not supported by this browser');
            const coordsDisplay = document.getElementById('coordinates-display');
            if (coordsDisplay) {
                coordsDisplay.textContent = 'Location unavailable';
            }
        }
    }
    updateCoordinatesDisplay() {
        const coordsDisplay = document.getElementById('coordinates-display');
        if (coordsDisplay && this.formData.latitude !== undefined && this.formData.longitude !== undefined) {
            coordsDisplay.textContent = `GPS: ${this.formData.latitude.toFixed(6)}, ${this.formData.longitude.toFixed(6)}`;
        }
    }
    initializeSignaturePad() {
        const canvas = document.getElementById('signature-pad');
        this.signaturePad = new SignaturePad(canvas, {
            backgroundColor: 'rgb(255, 255, 255)',
            penColor: 'rgb(0, 0, 0)',
            velocityFilterWeight: 0.7,
            minWidth: 0.5,
            maxWidth: 2.5,
            throttle: 16, // Increase smoothness
            minDistance: 1,
        });
        // Adjust canvas size
        const resizeCanvas = () => {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext('2d')?.scale(ratio, ratio);
            this.signaturePad.clear();
        };
        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        // Clear signature button
        const clearButton = document.getElementById('clear-signature');
        if (clearButton) {
            clearButton.addEventListener('click', () => {
                this.signaturePad.clear();
                this.formData.signature = '';
                this.saveToLocalStorage();
            });
        }
        // Save signature after drawing
        this.signaturePad.onEnd = () => {
            this.formData.signature = this.signaturePad.toDataURL();
            this.saveToLocalStorage();
        };
        // Prevent scrolling while signing on touch devices
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
        }, { passive: false });
        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }
    attachEventListeners() {
        // Input event listeners
        const inputs = this.form.querySelectorAll('input[type="text"], input[type="date"], input[type="time"], input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                const target = e.target;
                const field = this.getFieldName(target.name);
                if (field in this.formData) {
                    if (target.type === 'number') {
                        this.formData[field] = parseFloat(target.value) || 0;
                    }
                    else {
                        this.formData[field] = target.value;
                    }
                }
                this.saveToLocalStorage();
            });
        });
        // Checkbox event listeners
        const checkboxes = this.form.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const target = e.target;
                const field = this.getFieldName(target.name);
                if (field in this.formData) {
                    this.formData[field] = target.checked;
                }
                this.saveToLocalStorage();
            });
        });
        // Load saved data on page load
        this.loadFromLocalStorage();
    }
    getFieldName(name) {
        // Convert kebab-case to camelCase
        return name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
    }
    saveToLocalStorage() {
        localStorage.setItem('disposalTicket', JSON.stringify(this.formData));
    }
    loadFromLocalStorage() {
        const savedData = localStorage.getItem('disposalTicket');
        if (savedData) {
            this.formData = JSON.parse(savedData);
            this.populateForm();
        }
    }
    populateForm() {
        // Populate text, date, time, and number inputs
        Object.entries(this.formData).forEach(([key, value]) => {
            if (typeof value !== 'boolean' && key !== 'signature' && value !== undefined) {
                const input = this.form.querySelector(`[name="${this.toKebabCase(key)}"]`);
                if (input) {
                    input.value = value.toString();
                }
            }
        });
        // Populate checkboxes
        const checkboxFields = ['saltWater', 'flowBack', 'other', 'stockTank', 'fracTank', 'pit'];
        checkboxFields.forEach(field => {
            const checkbox = this.form.querySelector(`[name="${this.toKebabCase(field)}"]`);
            if (checkbox) {
                checkbox.checked = this.formData[field];
            }
        });
        // Update coordinates display if available
        this.updateCoordinatesDisplay();
        // Restore signature if exists
        if (this.formData.signature) {
            const image = new Image();
            image.onload = () => {
                const context = this.signaturePad.canvas.getContext('2d');
                context.drawImage(image, 0, 0);
            };
            image.src = this.formData.signature;
        }
    }
    toKebabCase(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }
}
// Initialize the form when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DisposalTicketForm();
});
