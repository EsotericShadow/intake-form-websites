// script.js

// → YOUR Cloudinary & Zapier settings:
const CLOUD_NAME    = 'ddhinryyk';           // ← replace with your Cloudinary cloud name
const UPLOAD_PRESET = 'unsigned_intake';      // ← replace with your unsigned upload preset
const ZAP_URL       = 'https://hooks.zapier.com/hooks/catch/22045060/2p8r55k/';

// Upload one file to Cloudinary → returns secure URL
async function uploadToCloudinary(file, folder) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`;
  const fd  = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  fd.append('folder', folder);
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const data = await res.json();
  return data.secure_url;
}

// 1) Clone website-entry blocks
document.getElementById('add-website').addEventListener('click', () => {
  const entry = document.querySelector('.website-entry');
  const clone = entry.cloneNode(true);
  clone.querySelector('input').value    = '';
  clone.querySelector('textarea').value = '';
  document.getElementById('website-entries').appendChild(clone);
});

// 2) Show/hide “Other” controls
;[
  { sel: 'select[name="preferred_fonts"]',  tgt: 'other-fonts' },
  { sel: 'select[name="primary_cta"]',      tgt: 'other-cta' }
].forEach(({sel,tgt}) => {
  document.querySelector(sel).addEventListener('change', function() {
    document.getElementById(tgt).style.display =
      (this.value === 'Other' ? 'block' : 'none');
  });
});
document.querySelector('input[name="functionalities[]"][value="Other"]')
  .addEventListener('change', function(){
    document.getElementById('other-functionalities').style.display =
      (this.checked ? 'block' : 'none');
  });
document.querySelector('input[name="pages[]"][value="Other"]')
  .addEventListener('change', function(){
    document.getElementById('other-pages').style.display =
      (this.checked ? 'block' : 'none');
  });

// 3) On submit: upload files → send text+URLs to Zapier
document.getElementById('intake-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.target;
  const fd   = new FormData(form);

  // Build folder name: intake_uploads/<Client_Name>
  let client = (fd.get('full_name') || 'unknown')
                 .trim().replace(/\s+/g, '_');
  const folder = `intake_uploads/${client}`;

  // Find all file-input names
  const fileInputs = Array.from(
    form.querySelectorAll('input[type="file"]')
  ).map(i=>i.name);

  // Upload files & collect URLs
  const urlFields = {};
  for (let name of fileInputs) {
    const files = fd.getAll(name);
    if (!files.length) continue;
    const urls = [];
    for (let f of files) {
      if (f instanceof File) {
        const url = await uploadToCloudinary(f, folder);
        urls.push(url);
      }
    }
    urlFields[`${name}_urls`] = urls;
    fd.delete(name);
  }

  // Build JSON payload: all text fields + our URL arrays
  const payload = {};
  for (let [k,v] of fd.entries()) payload[k] = v;
  Object.assign(payload, urlFields);

  // Send to Zapier as JSON
  try {
    const resp = await fetch(ZAP_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (resp.ok) {
      alert('✅ Submission saved! We’ll follow up soon.');
      form.reset();
    } else {
      console.error('Zapier error:', await resp.text());
      alert('❌ Error saving your data—please try again.');
    }
  } catch (err) {
    console.error('Network error:', err);
    alert('❌ Network error—check your connection and try again.');
  }
});
