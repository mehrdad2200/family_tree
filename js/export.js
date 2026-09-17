/**
 * شجره‌نامه - Export Module
 * PDF, PNG, HTML, JSON exports
 */

class Exporter {
  constructor(app) {
    this.app = app;
  }

  async exportPDF() {
    const { jsPDF } = window.jspdf;
    const treeEl = document.getElementById('tree-viewport');
    
    if (!treeEl || this.app.people.length === 0) {
      this.app.toast('ابتدا افرادی اضافه کنید');
      return;
    }

    this.app.toast('در حال ساخت PDF...');

    try {
      // Temporarily reset transform for clean capture
      const originalTransform = treeEl.style.transform;
      treeEl.style.transform = 'none';
      
      const canvas = await html2canvas(treeEl, {
        backgroundColor: '#f8faf9',
        scale: 2,
        useCORS: true,
        logging: false
      });

      treeEl.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const margin = 10;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin * 2 - 20;

      // Title
      pdf.setFont('helvetica');
      pdf.setFontSize(16);
      const title = this.app.currentProject?.name || 'شجره‌نامه';
      pdf.text(title, pageWidth / 2, 15, { align: 'center' });

      // Image
      const imgRatio = canvas.width / canvas.height;
      let imgWidth = usableWidth;
      let imgHeight = imgWidth / imgRatio;
      
      if (imgHeight > usableHeight) {
        imgHeight = usableHeight;
        imgWidth = imgHeight * imgRatio;
      }

      const x = (pageWidth - imgWidth) / 2;
      pdf.addImage(imgData, 'PNG', x, 22, imgWidth, imgHeight);

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(150);
      pdf.text(`تولید شده با شجره‌نامه — ${new Date().toLocaleDateString('fa-IR')}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
      this.app.toast('PDF با موفقیت دانلود شد');
    } catch (err) {
      console.error(err);
      this.app.toast('خطا در ساخت PDF');
    }
  }

  async exportPNG() {
    const treeEl = document.getElementById('tree-viewport');
    
    if (!treeEl || this.app.people.length === 0) {
      this.app.toast('ابتدا افرادی اضافه کنید');
      return;
    }

    this.app.toast('در حال ساخت تصویر...');

    try {
      const originalTransform = treeEl.style.transform;
      treeEl.style.transform = 'none';

      const canvas = await html2canvas(treeEl, {
        backgroundColor: '#f8faf9',
        scale: 3,
        useCORS: true,
        logging: false
      });

      treeEl.style.transform = originalTransform;

      const link = document.createElement('a');
      link.download = `${(this.app.currentProject?.name || 'shajareh').replace(/\s+/g, '_')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      this.app.toast('تصویر با موفقیت دانلود شد');
    } catch (err) {
      console.error(err);
      this.app.toast('خطا در ساخت تصویر');
    }
  }

  exportJSON() {
    db.exportAll().then(data => {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `shajareh_backup_${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      this.app.toast('فایل پشتیبان دانلود شد');
    });
  }

  exportHTML() {
    if (!this.app.currentProject || this.app.people.length === 0) {
      this.app.toast('ابتدا افرادی اضافه کنید');
      return;
    }

    const project = this.app.currentProject;
    const people = this.app.people;
    const relationships = this.app.relationships;

    const peopleMap = {};
    people.forEach(p => peopleMap[p.id] = p);

    let peopleHtml = people.map(p => {
      const fullName = [p.firstName, p.lastName].filter(Boolean).join(' ');
      const dates = [p.birthDate, p.deathDate].filter(Boolean).join(' – ');
      return `
        <div class="person" id="person-${p.id}">
          <h3>${fullName || 'بدون نام'}</h3>
          <p class="dates">${dates || ''}</p>
          ${p.birthPlace ? `<p>محل تولد: ${p.birthPlace}</p>` : ''}
          ${p.occupation ? `<p>شغل: ${p.occupation}</p>` : ''}
          ${p.bio ? `<p class="bio">${p.bio}</p>` : ''}
        </div>
      `;
    }).join('\n');

    const html = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} — شجره‌نامه</title>
  <link href="https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Vazirmatn', Tahoma, sans-serif;
      background: #f8faf9;
      color: #1a1a1a;
      line-height: 1.7;
      padding: 2rem;
    }
    .container { max-width: 900px; margin: 0 auto; }
    header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #2d6a4f;
    }
    header h1 { font-size: 2rem; color: #1b4332; margin-bottom: 0.5rem; }
    header p { color: #6b7280; }
    .stats {
      display: flex;
      justify-content: center;
      gap: 2rem;
      margin-top: 1rem;
      font-size: 0.9rem;
      color: #40916c;
    }
    .person {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      border-right: 4px solid #2d6a4f;
    }
    .person h3 { font-size: 1.2rem; margin-bottom: 0.3rem; }
    .person .dates { color: #6b7280; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .person .bio { margin-top: 0.75rem; color: #374151; }
    footer {
      text-align: center;
      margin-top: 3rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e5e7eb;
      color: #9ca3af;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${project.name}</h1>
      ${project.description ? `<p>${project.description}</p>` : ''}
      <div class="stats">
        <span>${people.length} نفر</span>
        <span>${relationships.length} رابطه</span>
      </div>
    </header>
    
    <main>
      ${peopleHtml}
    </main>
    
    <footer>
      تولید شده با نرم‌افزار شجره‌نامه — ${new Date().toLocaleDateString('fa-IR')}
    </footer>
  </div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/\s+/g, '_')}.html`;
    link.click();
    URL.revokeObjectURL(url);
    
    this.app.toast('فایل HTML دانلود شد');
  }
}
