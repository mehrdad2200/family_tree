/**
 * شجره‌نامه — Export Engine
 * PDF, PNG, HTML, JSON, GEDCOM
 */

class ExportEngine {
  constructor(app) {
    this.app = app;
  }

  async exportPDFTree() {
    if (!this.app.people.length) {
      this.app.toast('ابتدا افرادی اضافه کنید', 'error');
      return;
    }

    this.app.toast('در حال ساخت PDF...');

    try {
      const wrapper = document.getElementById('tree-wrapper');
      const originalTransform = this.app.renderer.overlay.style.transform;
      
      // Reset for clean capture
      this.app.renderer.scale = 1;
      this.app.renderer.offsetX = 40;
      this.app.renderer.offsetY = 40;
      this.app.renderer._applyTransform();
      this.app.renderer.render();

      await new Promise(r => setTimeout(r, 300));

      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#f8faf9',
        scale: 2,
        useCORS: true,
        logging: false,
        allowTaint: true
      });

      this.app.renderer.overlay.style.transform = originalTransform;
      this.app.renderer.render();

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;

      // Title
      pdf.setFontSize(18);
      pdf.text(this.app.currentProject?.name || 'شجره‌نامه', pageW / 2, 16, { align: 'center' });

      const imgData = canvas.toDataURL('image/png');
      const ratio = canvas.width / canvas.height;
      let imgW = pageW - margin * 2;
      let imgH = imgW / ratio;
      if (imgH > pageH - 40) {
        imgH = pageH - 40;
        imgW = imgH * ratio;
      }

      pdf.addImage(imgData, 'PNG', (pageW - imgW) / 2, 24, imgW, imgH);

      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`تولید شده با شجره‌نامه — ${new Date().toLocaleDateString('fa-IR')}`, pageW / 2, pageH - 8, { align: 'center' });

      pdf.save(`${(this.app.currentProject?.name || 'shajareh').replace(/\s+/g, '_')}_tree.pdf`);
      this.app.toast('PDF با موفقیت ذخیره شد', 'success');
    } catch (err) {
      console.error(err);
      this.app.toast('خطا در ساخت PDF', 'error');
    }
  }

  async exportPNG() {
    if (!this.app.people.length) {
      this.app.toast('ابتدا افرادی اضافه کنید', 'error');
      return;
    }

    this.app.toast('در حال ساخت تصویر...');

    try {
      const wrapper = document.getElementById('tree-wrapper');
      const canvas = await html2canvas(wrapper, {
        backgroundColor: '#f8faf9',
        scale: 3,
        useCORS: true,
        logging: false
      });

      canvas.toBlob(blob => {
        Utils.downloadBlob(blob, `${(this.app.currentProject?.name || 'shajareh').replace(/\s+/g, '_')}.png`);
        this.app.toast('تصویر ذخیره شد', 'success');
      }, 'image/png');
    } catch (err) {
      console.error(err);
      this.app.toast('خطا در ساخت تصویر', 'error');
    }
  }

  exportJSON() {
    db.exportAll().then(data => {
      Utils.downloadText(JSON.stringify(data, null, 2), `shajareh_backup_${new Date().toISOString().slice(0,10)}.json`, 'application/json');
      this.app.toast('پشتیبان دانلود شد', 'success');
    });
  }

  exportHTML() {
    if (!this.app.currentProject || !this.app.people.length) {
      this.app.toast('ابتدا افرادی اضافه کنید', 'error');
      return;
    }

    const project = this.app.currentProject;
    const people = this.app.people;
    const rels = this.app.relationships;

    const peopleHtml = people.map(p => {
      const name = Utils.fullName(p);
      const dates = Utils.dates(p);
      return `
        <article class="person-card" id="p-${p.id}">
          <div class="avatar">${Utils.initials(p)}</div>
          <div class="info">
            <h3>${Utils.escapeHtml(name)}</h3>
            <p class="dates">${Utils.escapeHtml(dates)}</p>
            ${p.birthPlace ? `<p>محل تولد: ${Utils.escapeHtml(p.birthPlace)}</p>` : ''}
            ${p.occupation ? `<p>شغل: ${Utils.escapeHtml(p.occupation)}</p>` : ''}
            ${p.bio ? `<p class="bio">${Utils.escapeHtml(p.bio)}</p>` : ''}
          </div>
        </article>
      `;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${Utils.escapeHtml(project.name)} — شجره‌نامه</title>
<link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Vazirmatn',Tahoma,sans-serif;background:#f8faf9;color:#0f172a;line-height:1.7;padding:2rem}
  .container{max-width:900px;margin:0 auto}
  header{text-align:center;margin-bottom:3rem;padding-bottom:1.5rem;border-bottom:3px solid #2d6a4f}
  header h1{font-size:2rem;color:#1b4332;margin-bottom:.5rem}
  .stats{display:flex;justify-content:center;gap:2rem;margin-top:1rem;color:#40916c;font-size:.95rem}
  .person-card{display:flex;gap:1.25rem;background:#fff;border-radius:14px;padding:1.25rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(0,0,0,.06);border-right:4px solid #2d6a4f}
  .avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#95d5b2,#40916c);display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.4rem;font-weight:700;flex-shrink:0}
  .info h3{font-size:1.15rem;margin-bottom:.2rem}
  .dates{color:#64748b;font-size:.9rem}
  .bio{margin-top:.6rem;color:#334155}
  footer{text-align:center;margin-top:3rem;padding-top:1.5rem;border-top:1px solid #e2e8e5;color:#94a3b8;font-size:.85rem}
</style>
</head>
<body>
<div class="container">
  <header>
    <h1>${Utils.escapeHtml(project.name)}</h1>
    ${project.description ? `<p>${Utils.escapeHtml(project.description)}</p>` : ''}
    <div class="stats">
      <span>${people.length} نفر</span>
      <span>${rels.length} رابطه</span>
    </div>
  </header>
  <main>${peopleHtml}</main>
  <footer>تولید شده با نرم‌افزار شجره‌نامه — ${new Date().toLocaleDateString('fa-IR')}</footer>
</div>
</body>
</html>`;

    Utils.downloadText(html, `${project.name.replace(/\s+/g, '_')}.html`, 'text/html');
    this.app.toast('فایل HTML ذخیره شد', 'success');
  }

  exportGEDCOM() {
    if (!this.app.people.length) {
      this.app.toast('ابتدا افرادی اضافه کنید', 'error');
      return;
    }

    let ged = '0 HEAD\n1 SOUR Shajareh\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n1 CHAR UTF-8\n';

    const idMap = new Map();
    this.app.people.forEach((p, i) => {
      const xref = `I${i + 1}`;
      idMap.set(p.id, xref);

      ged += `0 ${xref} INDI\n`;
      ged += `1 NAME ${p.firstName || ''} /${p.lastName || ''}/\n`;
      if (p.gender === 'male') ged += '1 SEX M\n';
      else if (p.gender === 'female') ged += '1 SEX F\n';
      if (p.birthDate) {
        ged += '1 BIRT\n';
        ged += `2 DATE ${p.birthDate}\n`;
        if (p.birthPlace) ged += `2 PLAC ${p.birthPlace}\n`;
      }
      if (p.deathDate) {
        ged += '1 DEAT\n';
        ged += `2 DATE ${p.deathDate}\n`;
        if (p.deathPlace) ged += `2 PLAC ${p.deathPlace}\n`;
      }
      if (p.occupation) ged += `1 OCCU ${p.occupation}\n`;
    });

    // Families (simplified: group by spouses + children)
    // For a basic export we create one FAM per couple
    let famIndex = 1;
    const processed = new Set();

    this.app.relationships.forEach(rel => {
      if (rel.type !== 'spouse' && rel.type !== 'ex-spouse') return;
      const key = [rel.fromId, rel.toId].sort().join('-');
      if (processed.has(key)) return;
      processed.add(key);

      const husb = idMap.get(rel.fromId);
      const wife = idMap.get(rel.toId);
      if (!husb || !wife) return;

      ged += `0 F${famIndex} FAM\n`;
      ged += `1 HUSB ${husb}\n`;
      ged += `1 WIFE ${wife}\n`;

      // Find children of either
      this.app.relationships.forEach(r => {
        if ((r.type === 'father' || r.type === 'mother' || r.type === 'parent') &&
            (r.fromId === rel.fromId || r.fromId === rel.toId)) {
          const child = idMap.get(r.toId);
          if (child) ged += `1 CHIL ${child}\n`;
        }
      });

      famIndex++;
    });

    ged += '0 TRLR\n';

    Utils.downloadText(ged, `${(this.app.currentProject?.name || 'family').replace(/\s+/g, '_')}.ged`, 'text/plain');
    this.app.toast('فایل GEDCOM ذخیره شد', 'success');
  }
}

window.ExportEngine = ExportEngine;
