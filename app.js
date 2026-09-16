const KEY='family-tree-v1';
const seed={familyName:'خانواده آزادگان',font:'Vazirmatn, Tahoma, sans-serif',accent:'#4f46e5',people:[
{id:'p1',name:'حسن آزادگان',gender:'male',birth:'۱۲۹۵',death:'۱۳۷۰',father:'',mother:'',spouse:'p2',notes:''},
{id:'p2',name:'زهرا',gender:'female',birth:'۱۳۰۰',death:'۱۳۷۸',father:'',mother:'',spouse:'p1',notes:''},
{id:'p3',name:'علی آزادگان',gender:'male',birth:'۱۳۲۰',death:'۱۳۹۸',father:'p1',mother:'p2',spouse:'p4',notes:''},
{id:'p4',name:'فاطمه',gender:'female',birth:'۱۳۲۵',death:'',father:'',mother:'',spouse:'p3',notes:''},
{id:'p5',name:'حسین آزادگان',gender:'male',birth:'۱۳۵۰',death:'',father:'p3',mother:'p4',spouse:'',notes:''},
{id:'p6',name:'سارا آزادگان',gender:'female',birth:'۱۳۵۴',death:'',father:'p3',mother:'p4',spouse:'',notes:''}
]};
let db=JSON.parse(localStorage.getItem(KEY)||'null')||seed;
let zoom=1, editing=null; let media=JSON.parse(localStorage.getItem('family-media-v2')||'[]');
const $=s=>document.querySelector(s);
const esc=s=>String(s||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function save(){localStorage.setItem(KEY,JSON.stringify(db));$('#saveState').textContent='ذخیره شد ✓';setTimeout(()=>$('#saveState').textContent='ذخیره خودکار فعال',900)}
function render(){document.documentElement.style.setProperty('--accent',db.accent);document.body.style.fontFamily=db.font;$('#familyTitle').textContent=db.familyName;renderTree();renderPeople();renderTimeline();renderStats();renderMedia();fillSettings()}
function childrenOf(id){return db.people.filter(p=>p.father===id||p.mother===id)}
function renderTree(){
 const roots=db.people.filter(p=>!p.father&&!p.mother);
 const canvas=$('#treeCanvas'); canvas.style.transform=`scale(${zoom})`;
 if(!db.people.length){canvas.innerHTML='<div class="person-item">هنوز فردی اضافه نشده است.</div>';return}
 function node(p){
   const kids=childrenOf(p.id);
   return `<div class="family-block"><div class="person-card" onclick="openPerson('${p.id}')"><div class="avatar">${p.gender==='female'?'👩':'👨'}</div><b>${esc(p.name)}</b><small>${esc(p.birth)}${p.death?' — '+esc(p.death):''}</small></div>${kids.length?`<div class="children">${kids.map(k=>`<div class="child">${node(k)}</div>`).join('')}</div>`:''}</div>`
 }
 canvas.innerHTML=`<div class="tree-row">${roots.map(node).join('')}</div>`;
}
function renderPeople(){
 $('#peopleGrid').innerHTML=db.people.map(p=>`<div class="person-item" onclick="openPerson('${p.id}')"><b>${p.gender==='female'?'👩':'👨'} ${esc(p.name)}</b><p>${p.birth||'—'} ${p.death?' تا '+p.death:''}<br>${esc(p.birthPlace||'')}</p></div>`).join('');
}
function renderTimeline(){
 const arr=db.people.filter(p=>p.birth).sort((a,b)=>String(a.birth).localeCompare(String(b.birth),'fa'));
 $('#timeline').innerHTML=arr.map(p=>`<div class="event"><div class="year">${esc(p.birth)}</div><div><b>${esc(p.name)}</b><div>${p.death?'درگذشت: '+esc(p.death):'در قید حیات'}</div></div></div>`).join('')||'<div class="person-item">رویدادی ثبت نشده است.</div>';
}
function renderStats(){
 const male=db.people.filter(p=>p.gender==='male').length,female=db.people.length-male;
 const generations=Math.max(1,...db.people.map(p=>generation(p.id)));
 $('#stats').innerHTML=[['تعداد افراد',db.people.length],['مردان',male],['زنان',female],['تعداد نسل‌ها',generations],['عکس‌ها','—'],['اسناد','—']].map(x=>`<div class="stat"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('');
}
function generation(id,seen=new Set()){if(seen.has(id))return 1;seen.add(id);const p=db.people.find(x=>x.id===id);if(!p)return 1;const parents=[p.father,p.mother].filter(Boolean);return 1+(parents.length?Math.max(...parents.map(x=>generation(x,seen))):0)}
function fillSettings(){
 $('#familyName').value=db.familyName;$('#fontSelect').value=db.font;$('#accent').value=db.accent;
}
function fillSelect(id,current=''){
 const el=$(id); const opts=db.people.filter(p=>p.id!==editing).map(p=>`<option value="${p.id}" ${p.id===current?'selected':''}>${esc(p.name)}</option>`).join('');
 el.innerHTML='<option value="">— بدون انتخاب —</option>'+opts;
}
function openPerson(id=''){
 editing=id; const p=db.people.find(x=>x.id===id)||{name:'',gender:'male',birth:'',death:'',birthPlace:'',father:'',mother:'',spouse:'',notes:''};
 $('#modalTitle').textContent=id?'ویرایش فرد':'افزودن فرد';$('#personId').value=id;
 $('#personName').value=p.name;$('#gender').value=p.gender;$('#birth').value=p.birth;$('#death').value=p.death;$('#birthPlace').value=p.birthPlace||'';$('#notes').value=p.notes||'';
 fillSelect('#father',p.father);fillSelect('#mother',p.mother);fillSelect('#spouse',p.spouse);
 $('#deletePerson').style.display=id?'block':'none';$('#modal').classList.remove('hidden');
}
function closeModal(){$('#modal').classList.add('hidden');editing=null}
function download(name,type,data){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([data],{type}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));$('#view-'+b.dataset.view).classList.add('active')});
$('#addPerson').onclick=$('#addPerson2').onclick=()=>openPerson();
$('#closeModal').onclick=$('#cancel').onclick=closeModal;
$('#personForm').onsubmit=e=>{e.preventDefault();const id=$('#personId').value||'p'+Date.now();const p={id,name:$('#personName').value.trim(),gender:$('#gender').value,birth:$('#birth').value.trim(),death:$('#death').value.trim(),birthPlace:$('#birthPlace').value.trim(),father:$('#father').value,mother:$('#mother').value,spouse:$('#spouse').value,notes:$('#notes').value};if(!p.name)return;if(editing){const i=db.people.findIndex(x=>x.id===id);db.people[i]=p}else db.people.push(p);save();closeModal();render()};
$('#deletePerson').onclick=()=>{if(!editing)return;if(confirm('این فرد و ارتباط‌های مستقیم او حذف شود؟')){db.people=db.people.filter(p=>p.id!==editing).map(p=>({...p,father:p.father===editing?'':p.father,mother:p.mother===editing?'':p.mother,spouse:p.spouse===editing?'':p.spouse}));save();closeModal();render()}};
$('#search').oninput=e=>{const q=e.target.value.trim();if(!q){renderPeople();return}$('#peopleGrid').innerHTML=db.people.filter(p=>p.name.includes(q)).map(p=>`<div class="person-item" onclick="openPerson('${p.id}')"><b>${esc(p.name)}</b><p>${esc(p.birth)}</p></div>`).join('')};
$('#zoomIn').onclick=()=>{zoom=Math.min(1.8,zoom+.1);renderTree()};$('#zoomOut').onclick=()=>{zoom=Math.max(.5,zoom-.1);renderTree()};$('#resetZoom').onclick=()=>{zoom=1;renderTree()};$('#expandAll').onclick=()=>{zoom=1;renderTree()};
$('#saveSettings').onclick=()=>{db.familyName=$('#familyName').value.trim()||'خانواده';db.font=$('#fontSelect').value;db.accent=$('#accent').value;save();render()};
$('#exportJson').onclick=()=>download('family-tree-backup.json','application/json;charset=utf-8',JSON.stringify(db,null,2));
$('#exportPrint').onclick=()=>window.print();
$('#exportSvg').onclick=()=>{const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800"><foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Tahoma;direction:rtl;padding:40px">${$('#treeCanvas').innerHTML}</div></foreignObject></svg>`;download('family-tree.svg','image/svg+xml',svg)};
$('#exportHtml').onclick=()=>{const html='<!doctype html><html lang="fa" dir="rtl"><meta charset="utf-8"><title>'+esc(db.familyName)+'</title><style>body{font-family:Tahoma;padding:30px;background:#f5f6fa}.person-card{display:inline-block;background:white;border:1px solid #ddd;border-radius:12px;padding:15px;margin:8px;min-width:150px;text-align:center}.avatar{font-size:25px}</style><h1>'+esc(db.familyName)+'</h1><div>'+$('#treeCanvas').innerHTML+'</div></html>';download('family-tree.html','text/html;charset=utf-8',html)};
window.openPerson=openPerson;render();

function renderMedia(){
 const g=$('#mediaGrid'); if(!g)return;
 g.innerHTML=media.length?media.map((m,i)=>`<div class="media-item">${m.type.startsWith('image/')?`<img src="${m.data}" alt="">`:''}<b>${esc(m.name)}</b><p>${esc(m.personName||'بدون اتصال به فرد')}</p><button class="btn danger" onclick="removeMedia(${i})">حذف</button></div>`).join(''):'<div class="person-item">هنوز فایلی اضافه نشده است.</div>';
}
function removeMedia(i){media.splice(i,1);localStorage.setItem('family-media-v2',JSON.stringify(media));renderMedia()}
$('#addMedia')?.addEventListener('click',()=>$('#mediaFile').click());
$('#mediaFile')?.addEventListener('change',e=>{
 const file=e.target.files[0]; if(!file)return;
 const r=new FileReader(); r.onload=()=>{media.push({name:file.name,type:file.type,data:r.result,personName:''});localStorage.setItem('family-media-v2',JSON.stringify(media));renderMedia()};r.readAsDataURL(file);
});
$('#cloudBtn')?.addEventListener('click',()=>{alert('اتصال واقعی Google/Firebase در این نسخه به‌صورت آماده‌سازی رابط انجام شده است. برای اتصال واقعی باید پروژه Cloud و کلیدهای آن تنظیم شوند.');$('#cloudStatus').textContent='برای فعال‌سازی Cloud واقعی، Firebase/Supabase باید به پروژه متصل شود.'});
$('#googleLogin')?.addEventListener('click',()=>alert('ورود Google نیازمند تنظیم OAuth Client ID در سرویس Cloud پروژه است.'));
$('#shareProject')?.addEventListener('click',()=>{
 const encoded=btoa(unescape(encodeURIComponent(JSON.stringify(db))));
 const url=location.href.split('#')[0]+'#share='+encoded;
 navigator.clipboard?.writeText(url); alert('لینک اشتراک محلی ساخته و در صورت پشتیبانی مرورگر کپی شد. برای لینک عمومی دائمی، نسخه Cloud لازم است.');
});
$('#exportGedcom')?.addEventListener('click',()=>{
 let out='0 HEAD\n1 SOUR FamilyTree\n1 CHAR UTF-8\n';
 db.people.forEach(p=>{out+=`0 @${p.id}@ INDI\n1 NAME ${p.name}\n1 SEX ${p.gender==='female'?'F':'M'}\n`;if(p.birth)out+=`1 BIRT\n2 DATE ${p.birth}\n`;if(p.death)out+=`1 DEAT\n2 DATE ${p.death}\n`;if(p.father)out+=`1 FAMC @F${p.father}@\n`;});
 out+='0 TRLR\n';download('family-tree.ged','application/x-gedcom;charset=utf-8',out);
});
$('#importJson')?.addEventListener('click',()=>$('#jsonFile').click());
$('#jsonFile')?.addEventListener('change',e=>{
 const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{try{const x=JSON.parse(r.result);if(x.people){db=x;save();render();alert('پشتیبان با موفقیت وارد شد.')}}catch(err){alert('فایل JSON معتبر نیست.')}};r.readAsText(f);
});
