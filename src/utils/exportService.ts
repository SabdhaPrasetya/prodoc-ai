import JSZip from 'jszip';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PRDDocument } from '../types/prd';

export function generateMarkdownContent(doc: PRDDocument): string {
  const lines: string[] = [];
  lines.push(`# ${doc.title}`);
  lines.push(`**Kode Dokumen:** ${doc.code} · **Versi:** ${doc.version} · **Status:** ${doc.status}`);
  lines.push(`**Penanggung Jawab:** ${doc.ownerName} · **Target Rilis:** ${doc.targetReleaseDate}`);
  lines.push(`**Template:** ${doc.templateName}`);
  lines.push('');
  lines.push(`## Ringkasan Eksekutif`);
  lines.push(doc.summary);
  lines.push('');
  lines.push(`---`);
  lines.push('');

  for (const sec of doc.sections) {
    lines.push(`## ${sec.number}. ${sec.title}`);
    lines.push(`*Status Bagian: ${sec.status} · Terakhir diperbarui oleh ${sec.lastEditedBy} (${sec.lastEditedAt})*`);
    lines.push('');
    lines.push(sec.content);
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`## Daftar User Stories & Kriteria Penerimaan (Backlog)`);
  lines.push('');
  for (const us of doc.userStories) {
    lines.push(`### [${us.id}] ${us.persona} (${us.priority} · ${us.storyPoints} Story Points · Status: ${us.status})`);
    lines.push(`${us.story}`);
    lines.push('');
    lines.push(`**Acceptance Criteria:**`);
    for (const ac of us.acceptanceCriteria) {
      lines.push(`- [ ] ${ac}`);
    }
    lines.push('');
  }

  lines.push(`---`);
  lines.push(`## Spesifikasi Prompt & Komponen UI (Google Stitch)`);
  lines.push('```text');
  lines.push(doc.stitchPromptSpec || 'Belum ada spesifikasi Google Stitch.');
  lines.push('```');
  lines.push('');

  lines.push(`---`);
  lines.push(`## Jejak Audit Revisi Dokumen`);
  for (const rev of doc.revisions) {
    lines.push(`- **${rev.version}** (${rev.timestamp}) oleh ${rev.authorName} [${rev.authorRole}] pada *${rev.sectionTitle}*: ${rev.changeSummary}`);
  }

  return lines.join('\n');
}

export function exportPRDToPDF(doc: PRDDocument): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 16;
  const maxLineWidth = pageWidth - margin * 2;
  let y = 20;

  // Header Banner
  pdf.setFillColor(15, 23, 42); // Slate 900
  pdf.rect(0, 0, pageWidth, 38, 'F');

  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text(`SPECFORGE PRD SPECIFICATION  |  ${doc.code}  |  ${doc.version}`, margin, 13);

  pdf.setFontSize(15);
  const titleLines = pdf.splitTextToSize(doc.title, maxLineWidth);
  pdf.text(titleLines, margin, 22);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(203, 213, 225);
  pdf.text(
    `Owner: ${doc.ownerName}   ·   Status: ${doc.status}   ·   Target Rilis: ${doc.targetReleaseDate}`,
    margin,
    33
  );

  y = 48;

  // Executive Summary Box
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('Ringkasan Eksekutif', margin, y);
  y += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.setTextColor(51, 65, 85);
  const summaryLines = pdf.splitTextToSize(doc.summary, maxLineWidth);
  pdf.text(summaryLines, margin, y);
  y += summaryLines.length * 5 + 6;

  // Sections
  for (const sec of doc.sections) {
    if (y > 255) {
      pdf.addPage();
      y = 20;
    }

    pdf.setDrawColor(226, 232, 240);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11.5);
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${sec.number}. ${sec.title}`, margin, y);
    y += 5;

    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text(
      `Status: ${sec.status}  ·  Diperbarui oleh ${sec.lastEditedBy} (${sec.lastEditedAt})`,
      margin,
      y
    );
    y += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    pdf.setTextColor(30, 41, 59);
    const contentLines = pdf.splitTextToSize(sec.content, maxLineWidth);

    for (const line of contentLines) {
      if (y > 275) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, margin, y);
      y += 4.8;
    }
    y += 5;
  }

  // User Stories Table
  if (doc.userStories.length > 0) {
    if (y > 230) {
      pdf.addPage();
      y = 20;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(15, 23, 42);
    pdf.text('Backlog User Stories & Estimasi Teknis', margin, y);
    y += 4;

    autoTable(pdf, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [['ID', 'Persona', 'User Story & Acceptance Criteria', 'Prioritas', 'SP', 'Status']],
      body: doc.userStories.map((us) => [
        us.id,
        us.persona,
        `${us.story}\n\nKriteria:\n${us.acceptanceCriteria.map((c) => `• ${c}`).join('\n')}`,
        us.priority,
        String(us.storyPoints),
        us.status,
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 18, fontStyle: 'bold' },
        1: { cellWidth: 30 },
        2: { cellWidth: 78 },
        3: { cellWidth: 22 },
        4: { cellWidth: 10, halign: 'right' },
        5: { cellWidth: 20 },
      },
    });
  }

  // Revision History Table
  const finalY = (pdf as any).lastAutoTable?.finalY || y + 10;
  let revY = finalY + 12;
  if (revY > 240) {
    pdf.addPage();
    revY = 20;
  }

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.setTextColor(15, 23, 42);
  pdf.text('Riwayat Revisi & Audit Perubahan Real-Time', margin, revY);

  autoTable(pdf, {
    startY: revY + 4,
    margin: { left: margin, right: margin },
    head: [['Versi', 'Waktu', 'Penulis & Peran', 'Bagian', 'Ringkasan Perubahan']],
    body: doc.revisions.map((r) => [
      r.version,
      r.timestamp,
      `${r.authorName} (${r.authorRole})`,
      r.sectionTitle,
      r.changeSummary,
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
    },
  });

  const safeFilename = `${doc.code}_${doc.title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 35)}_${doc.version}.pdf`;
  pdf.save(safeFilename);
}

export async function exportPRDToZipBundle(doc: PRDDocument): Promise<void> {
  const zip = new JSZip();
  const folderName = `${doc.code}-${doc.version}`;
  const root = zip.folder(folderName) || zip;

  // 1. Complete Markdown Document
  const mdContent = generateMarkdownContent(doc);
  root.file(`${doc.code}_Full_Specification.md`, mdContent);

  // 2. Google Stitch UI Prompt & Component Blueprint
  const stitchContent = `# Google Stitch UI/UX Specification — ${doc.title} (${doc.code})
Version: ${doc.version}
Generated At: ${new Date().toISOString()}

## Stitch Prompt & Architecture Blueprint
${doc.stitchPromptSpec}

## Functional Screen Requirements Derived from PRD
${doc.sections.map((s) => `### ${s.number}. ${s.title}\n${s.content}`).join('\n\n')}
`;
  root.file(`google_stitch_ui_spec.md`, stitchContent);

  // 3. Jira CSV Import File
  const jiraCsvRows = [
    ['Summary', 'Issue Type', 'Priority', 'Story Points', 'Status', 'Assignee', 'Description'],
    ...doc.userStories.map((us) => [
      `"[${us.id}] ${us.story.replace(/"/g, '""')}"`,
      '"Story"',
      `"${us.priority}"`,
      `"${us.storyPoints}"`,
      `"${us.status}"`,
      `"${us.assignee}"`,
      `"Persona: ${us.persona}\n\nAcceptance Criteria:\n${us.acceptanceCriteria.map((c) => `- ${c}`).join('\n').replace(/"/g, '""')}"`,
    ]),
  ];
  const jiraCsvString = jiraCsvRows.map((row) => row.join(',')).join('\n');
  root.file(`jira_backlog_import_${doc.code}.csv`, jiraCsvString);

  // 4. Trello Board JSON Export Payload
  const trelloPayload = {
    name: `${doc.code}: ${doc.title}`,
    desc: doc.summary,
    version: doc.version,
    lists: ['Backlog', 'Dalam Pengembangan', 'Siap QA', 'Selesai'].map((listName) => ({
      name: listName,
      cards: doc.userStories
        .filter((u) => u.status === listName)
        .map((u) => ({
          name: `[${u.id}] ${u.story}`,
          desc: `Persona: ${u.persona}\nPrioritas: ${u.priority} (${u.storyPoints} SP)\n\nAcceptance Criteria:\n${u.acceptanceCriteria.map((c) => `- ${c}`).join('\n')}`,
          labels: [u.priority],
        })),
    })),
  };
  root.file(`trello_board_payload_${doc.code}.json`, JSON.stringify(trelloPayload, null, 2));

  // 5. Real-Time Revision Audit Log JSON
  root.file(
    `revision_audit_log_${doc.version}.json`,
    JSON.stringify(
      {
        documentId: doc.id,
        code: doc.code,
        title: doc.title,
        currentVersion: doc.version,
        exportedAt: new Date().toISOString(),
        revisions: doc.revisions,
      },
      null,
      2
    )
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.code}_Engineering_Handoff_Bundle_${doc.version}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
