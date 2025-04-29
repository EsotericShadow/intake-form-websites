// script.js

// → Your Zapier “Catch Hook” URL  
const ZAP_URL = 'https://hooks.zapier.com/hooks/catch/22045060/2p8r55k/';

// 1) Clone “website-entry” blocks when the user clicks “Add Another Website”
document.getElementById('add-website').addEventListener('click', () => {
  const entry   = document.querySelector('.website-entry');
  const clone   = entry.cloneNode(true);
  clone.querySelector('input').value    = '';
  clone.querySelector('textarea').value = '';
  document.getElementById('website-entries').appendChild(clone);
});

// 2) Show/hide “Other” fields
document.querySelector('select[name="preferred_fonts"]')
  .addEventListener('change', function() {
    document.getElementById('other-fonts')
      .style.display = (this.value === 'Other' ? 'block' : 'none');
  });

document.querySelector('select[name="primary_cta"]')
  .addEventListener('change', function() {
    document.getElementById('other-cta')
      .style.display = (this.value === 'Other' ? 'block' : 'none');
  });

document.querySelector('input[name="functionalities[]"][value="Other"]')
  .addEventListener('change', function() {
    document.getElementById('other-functionalities')
      .style.display = (this.checked ? 'block' : 'none');
  });

document.querySelector('input[name="pages[]"][value="Other"]')
  .addEventListener('change', function() {
    document.getElementById('other-pages')
      .style.display = (this.checked ? 'block' : 'none');
  });

// 3) Submit the form data (text + files) to Zapier
document.getElementById('intake-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;

  try {
    const resp = await fetch(ZAP_URL, {
      method: 'POST',
      body: new FormData(form)
    });

    if (resp.ok) {
      alert('✅ Thank you! Your submission has been saved.');
      form.reset();
    } else {
      console.error('Zapier responded with error:', await resp.text());
      alert('❌ Oops—there was a problem saving your form. Please try again.');
    }
  } catch (err) {
    console.error('Network error sending to Zapier:', err);
    alert('❌ Network error. Please check your connection and try again.');
  }
});
