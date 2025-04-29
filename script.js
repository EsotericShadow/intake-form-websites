/* =====================================================================
   Evergreen Web Solutions – Client Intake Form  (strict edition)
   ---------------------------------------------------------------------
   • Hard validation (type, size, megapixels, file-count)
   • Reliable Cloudinary upload  (resource_type = auto)
   • Sends plain URLs + text to Zapier
   ===================================================================== */

/* → 1. CLOUDINARY & ZAPIER ------------------------------------------ */
const CLOUD_NAME    = 'ddhinryyk';
const UPLOAD_PRESET = 'unsigned_intake';
const ZAP_URL       = 'https://hooks.zapier.com/hooks/catch/22045060/2p8r55k/';

/* → 2. FILE POLICY -------------------------------------------------- */
const POLICY = {
  // input name          allowed MIME prefixes               max files
  style_guide:    { types: ['application/pdf',
                            'application/msword',
                            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], max: 1 },
  brand_assets:   { types: ['application/zip','application/pdf','image/'], max: 3 },
  content_files:  { types: ['application/','text/'], max: 3 },
  image_files:    { types: ['image/'], max: 10 },
  other_assets:   { types: ['application/','image/'], max: 5 },
};
const MAX_IMAGE_MB = 10;
const MAX_OTHER_MB = 10;
const MAX_MP       = 25;   // megapixels

/* → 3. HELPER FUNCTIONS -------------------------------------------- */
function err(msg){ throw new Error(msg); }

function allowedType(file, field){
  return POLICY[field]?.types.some(p => file.type.startsWith(p)) ?? false;
}

function fileSizeOK(file){
  const mb = file.size / (1024*1024);
  return file.type.startsWith('image/')
         ? mb <= MAX_IMAGE_MB
         : mb <= MAX_OTHER_MB;
}

// check pixel dimensions for huge images
function checkImageMP(file){
  return new Promise((resolve,reject)=>{
    if (!file.type.startsWith('image/')) return resolve();
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const mp = img.width*img.height/1e6;
      URL.revokeObjectURL(img.src);
      mp > MAX_MP ? reject(`${file.name} is ${mp.toFixed(1)} MP (max ${MAX_MP})`) : resolve();
    };
    img.onerror = ()=>{ URL.revokeObjectURL(img.src); resolve(); };
  });
}

// Cloudinary upload – returns secure_url
async function uploadToCloudinary(file, folder=''){
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
  const fd  = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', UPLOAD_PRESET);
  if (folder) fd.append('folder', folder);
  const res = await fetch(url,{method:'POST',body:fd});
  if (!res.ok){
    console.error('Cloudinary body:', await res.text());
    err('Cloudinary upload failed');
  }
  return (await res.json()).secure_url;
}

function setStatus(txt,isErr=false){
  const el=document.getElementById('status');
  el.textContent = txt;
  el.style.color = isErr? '#f33':'#0f0';
}

/* → 4. UI BEHAVIOUR (clone blocks, show/hide “Other”) --------------- */
document.getElementById('add-website').addEventListener('click',()=>{
  const entry=document.querySelector('.website-entry').cloneNode(true);
  entry.querySelectorAll('input,textarea').forEach(el=>el.value='');
  document.getElementById('website-entries').appendChild(entry);
});
[
  {sel:'select[name="preferred_fonts"]', tgt:'other-fonts'},
  {sel:'select[name="primary_cta"]',     tgt:'other-cta'}
].forEach(({sel,tgt})=>{
  document.querySelector(sel).addEventListener('change',function(){
    document.getElementById(tgt).style.display = this.value==='Other'?'block':'none';
  });
});
document.querySelector('input[name="functionalities[]"][value="Other"]')
  .addEventListener('change',function(){
    document.getElementById('other-functionalities').style.display = this.checked?'block':'none';
  });
document.querySelector('input[name="pages[]"][value="Other"]')
  .addEventListener('change',function(){
    document.getElementById('other-pages').style.display = this.checked?'block':'none';
  });

/* → 5. SUBMIT HANDLER ---------------------------------------------- */
document.getElementById('intake-form').addEventListener('submit', async e=>{
  e.preventDefault();
  const form=e.target, btn=form.querySelector('button[type="submit"]');
  btn.disabled=true; setStatus('Validating files…');

  try{
    /* 5-A validate every file */
    for (const [field,policy] of Object.entries(POLICY)){
      const input=form.elements[field]||form.elements[field+'[]'];
      if (!input) continue;
      const files=[...input.files];
      if (files.length>policy.max) err(`Max ${policy.max} files in ${field}.`);
      for (const f of files){
        if (!allowedType(f,field)) err(`Type not allowed: ${f.name}`);
        if (!fileSizeOK(f))        err(`${f.name} exceeds size limit`);
        await checkImageMP(f);
      }
    }

    /* 5-B upload each file, replace with URLs */
    const fd=new FormData(form);
    const clientSlug=(fd.get('full_name')||'unknown').trim().replace(/\s+/g,'_');
    const folder=`intake_uploads/${clientSlug}`;

    for (const [field] of Object.entries(POLICY)){
      const files = fd.getAll(field).filter(v=>v instanceof File);
      if (!files.length) continue;
      const urls=[];
      for (const f of files){
        setStatus(`Uploading ${f.name}…`);
        urls.push(await uploadToCloudinary(f,folder));
      }
      fd.delete(field);
      fd.append(`${field}_urls`, JSON.stringify(urls));
    }

    /* 5-C submit to Zapier */
    setStatus('Sending data to Zapier…');
    const zap = await fetch(ZAP_URL,{method:'POST',body:fd});
    if (!zap.ok){
      console.error('Zapier body:', await zap.text());
      err('Zapier error, please try again.');
    }
    setStatus('✅ Submission saved!');
    alert('Thank you! We’ll follow up soon.');
    form.reset();
  }catch(ex){
    console.error(ex);
    setStatus(`❌ ${ex.message}`, true);
  }finally{
    btn.disabled=false;
  }
});
