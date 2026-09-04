document.addEventListener('DOMContentLoaded', () => {
    const introScreen = document.getElementById('intro-screen');
    const formScreen = document.getElementById('form-screen');
    const successScreen = document.getElementById('success-screen');
    const registrationForm = document.getElementById('registration-form');

    // Intro Animation Sequence
    // Total animation time is roughly 3.5 seconds (1s delay + 2.5s progress bar)
    setTimeout(() => {
        // Hide intro, show form
        introScreen.classList.add('hidden');
        introScreen.classList.remove('active');
        
        formScreen.classList.remove('hidden');
        formScreen.classList.add('active');
    }, 3800); // Wait 3.8s before showing the form

    // Custom Calendar Logic
    const calendarContainer = document.querySelector('.calendar-container');
    if (calendarContainer) {
        const grid = document.querySelector('.calendar-grid');
        const monthYearText = document.querySelector('.calendar-month-year');
        const prevBtn = document.querySelector('.prev-month');
        const nextBtn = document.querySelector('.next-month');
        const selectedDateInput = document.getElementById('selectedDate');
        
        let currentDate = new Date();
        let currentMonth = currentDate.getMonth();
        let currentYear = currentDate.getFullYear();
        let selectedDateValue = null;

        function renderCalendar(month, year) {
            // Clear existing days but keep the day names
            const dayElements = grid.querySelectorAll('.calendar-day');
            dayElements.forEach(el => el.remove());
            
            const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
            monthYearText.textContent = `${monthNames[month]} ${year}`;
            
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const firstDayIndex = new Date(year, month, 1).getDay();
            
            const today = new Date();
            today.setHours(0,0,0,0);
            
            // Add empty blocks for days before the 1st
            for (let i = 0; i < firstDayIndex; i++) {
                const emptyDiv = document.createElement('div');
                emptyDiv.classList.add('calendar-day', 'empty');
                grid.appendChild(emptyDiv);
            }
            
            for (let i = 1; i <= daysInMonth; i++) {
                const dayDiv = document.createElement('div');
                dayDiv.classList.add('calendar-day');
                dayDiv.textContent = i;
                
                const dateOfCell = new Date(year, month, i);
                const dayOfWeek = dateOfCell.getDay();
                
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
                const isPast = dateOfCell < today;
                
                if (!isWeekend || isPast) {
                    dayDiv.classList.add('disabled');
                } else {
                    dayDiv.classList.add('available');
                    dayDiv.addEventListener('click', () => {
                        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
                        dayDiv.classList.add('selected');
                        selectedDateValue = dateOfCell;
                        const dateString = selectedDateValue.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
                        selectedDateInput.value = dateString;
                    });
                }
                
                // Restore selected state
                if (selectedDateValue && 
                    selectedDateValue.getDate() === i && 
                    selectedDateValue.getMonth() === month && 
                    selectedDateValue.getFullYear() === year) {
                    dayDiv.classList.add('selected');
                }
                
                grid.appendChild(dayDiv);
            }
        }
        
        prevBtn.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) {
                currentMonth = 11;
                currentYear--;
            }
            renderCalendar(currentMonth, currentYear);
        });
        
        nextBtn.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) {
                currentMonth = 0;
                currentYear++;
            }
            renderCalendar(currentMonth, currentYear);
        });
        
        renderCalendar(currentMonth, currentYear);
    }

    // Form Submission Handling
    registrationForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent page reload

        const selectedDateInput = document.getElementById('selectedDate');
        if (!selectedDateInput.value) {
            alert('Please select a webinar date from the calendar.');
            return;
        }

        const submitBtn = registrationForm.querySelector('.submit-btn');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Registering...</span>';

        const formData = new FormData(registrationForm);
        
        // --- REPLACE THIS URL WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL ---
        const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzB9yYyoZvf3S00NYfpOoG1qncFwQgYrEbbJ_3v3-Qc5RVlw02rhRUy8qcZx3v21IkA/exec';
        
        if (SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
            alert('Please configure the Google Apps Script Web App URL in script.js first! Follow the guide in the artifact.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
            return;
        }

        fetch(SCRIPT_URL, {
            method: 'POST',
            body: formData,
            mode: 'no-cors' // Use no-cors to prevent CORS issues with Google Apps Script
        })
        .then(() => {
            // Hide form, show success animation
            formScreen.classList.add('hidden');
            formScreen.classList.remove('active');

            // Small delay to allow fade out before showing success
            setTimeout(() => {
                successScreen.classList.remove('hidden');
                successScreen.classList.add('active');
            }, 800);
        })
        .catch(error => {
            console.error('Error!', error.message);
            alert('Something went wrong. Please try again.');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        });
    });
});
