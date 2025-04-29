// script.js

// → YOUR Cloudinary & Zapier settings:
const CLOUD_NAME    = 'ddhinryyk';
const UPLOAD_PRESET = 'unsigned_intake';
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

// Check if an image exceeds 25 megapixels
function checkImageSize(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const mp = (img.width * img.height) / 1e6;
      URL.revokeObjectURL(img.src);
      if (mp > 25) reject(`${file.name} is ${mp.toFixed(1)}MP; max is 25MP.`);
      else resolve();
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); resolve(); };
  });
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

// 3) On submit: validate, upload files → send text+URLs to Zapier
document.getElementById('intake-form').addEventListener('submit', async e => {
  e.preventDefault();
  const form     = e.target;
  const statusEl = document.getElementById('status');
  const submitBtn = form.querySelector('button[type="submit"]');

  // disable submit & show status
  submitBtn.disabled = true;
  statusEl.textContent = 'Validating files…';

  // validation rules
  const MAX_IMAGE_MB = 10;
  const MAX_RAW_MB   = 10;
  const MAX_FILES    = 3;

  // gather all file inputs
  const fileInputs = Array.from(form.querySelectorAll('input[type="file"]'));

  // 3a) Validate file count & size & image dimensions
  for (let input of fileInputs) {
    const files = Array.from(input.files);
    if (files.length > MAX_FILES) {
      alert(`Select no more than ${MAX_FILES} files for ${input.name}.`);
      submitBtn.disabled = false; statusEl.textContent = '';
      return;
    }
    for (let file of files) {
      const sizeMB = file.size / (1024*1024);
      const isImage = file.type.startsWith('image/');
      const isRaw   = /\.(pdf|docx|zip)$/i.test(file.name);
      if (isImage && sizeMB > MAX_IMAGE_MB) {
        alert(`${file.name} is ${sizeMB.toFixed(1)}MB; max ${MAX_IMAGE_MB}MB.`);
        submitBtn.disabled = false; statusEl.textContent = '';
        return;
      }
      if (isRaw && sizeMB > MAX_RAW_MB) {
        alert(`${file.name} is ${sizeMB.toFixed(1)}MB; max ${MAX_RAW_MB}MB.`);
        submitBtn.disabled = false; statusEl.textContent = '';
        return;
      }
      if (isImage) {
        try {
          await checkImageSize(file);
        } catch (msg) {
          alert(msg);
          submitBtn.disabled = false; statusEl.textContent = '';
          return;
        }
      }
    }
  }

  statusEl.textContent = 'Uploading files…';
  const fd = new FormData(form);

  // dynamic folder: intake_uploads/<Client_Name>
  let client = (fd.get('full_name') || 'unknown').trim().replace(/\s+/g,'_');
  const folder = `intake_uploads/${client}`;

  // upload each file-input
  const urlFields = {};
  for (let input of fileInputs) {
    const name = input.name;
    const files = fd.getAll(name).filter(f => f instanceof File);
    if (!files.length) continue;
    const urls = [];
    for (let file of files) {
      statusEl.textContent = `Uploading ${file.name}…`;
      const url = await uploadToCloudinary(file, folder);
      urls.push(url);
    }
    urlFields[`${name}_urls`] = urls;
    fd.delete(name);
  }

  // build payload & send to Zapier
  statusEl.textContent = 'Sending data…';
  const payload = {};
  for (let [k,v] of fd.entries()) payload[k] = v;
  Object.assign(payload, urlFields);

  try {
    const resp = await fetch(ZAP_URL, {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    if (resp.ok) {
      statusEl.textContent = '✅ Submission saved!';
      alert('Thank you! We’ll follow up soon.');
      form.reset();
    } else {
      console.error('Zapier error:', await resp.text());
      alert('Error saving data—please try again.');
      statusEl.textContent = '';
    }
  } catch (err) {
    console.error('Network error:', err);
    alert('Network error—check connection and try again.');
    statusEl.textContent = '';
  } finally {
    submitBtn.disabled = false;
  }
});
