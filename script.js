// script.js
// Initialize EmailJS
emailjs.init('Ib6QRTySrwURIgYkJ');

// Add website-entry cloning
document.getElementById('add-website').addEventListener('click', function() {
    var entry = document.querySelector('.website-entry');
    var clone = entry.cloneNode(true);
    clone.querySelector('input').value = '';
    clone.querySelector('textarea').value = '';
    document.getElementById('website-entries').appendChild(clone);
});

// Show/hide "Other" inputs
document.querySelector('select[name="preferred_fonts"]').addEventListener('change', function() {
    document.getElementById('other-fonts').style.display = (this.value === 'Other' ? 'block' : 'none');
});
document.querySelector('select[name="primary_cta"]').addEventListener('change', function() {
    document.getElementById('other-cta').style.display = (this.value === 'Other' ? 'block' : 'none');
});
document.querySelector('input[name="functionalities[]"][value="Other"]').addEventListener('change', function() {
    document.getElementById('other-functionalities').style.display = (this.checked ? 'block' : 'none');
});
document.querySelector('input[name="pages[]"][value="Other"]').addEventListener('change', function() {
    document.getElementById('other-pages').style.display = (this.checked ? 'block' : 'none');
});

// Handle form submission via EmailJS
document.getElementById('intake-form').addEventListener('submit', function(event) {
    event.preventDefault();
    emailjs.sendForm('service_tzu0w6r', 'template_w0v5s49', this)
        .then(function() {
            alert('Thank you! Your form has been sent.');
            document.getElementById('intake-form').reset();
        }, function(error) {
            console.error('EmailJS Error:', error);
            alert('Oops… something went wrong. Please try again later.');
        });
});
