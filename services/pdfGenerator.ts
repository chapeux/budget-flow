import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Income, Expense, Investment, ScheduledEvent } from '../types';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const generateBudgetPDF = (
  incomes: Income[], 
  expenses: Expense[], 
  investments: Investment[], 
  scheduledEvents: ScheduledEvent[]
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Colors
  const primaryColor: [number, number, number] = [5, 150, 105]; // Emerald 600
  
  // --- HEADER & LOGO ---
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(14, 10, 12, 12, 2, 2, 'F');
  
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(17, 16, 23, 16); 
  doc.circle(20, 16, 0.5, 'S'); 

  // App Name
  doc.setFontSize(22);
  doc.setTextColor(30, 41, 59); // Slate 800
  doc.setFont('helvetica', 'bold');
  doc.text('BudgetFlow AI', 32, 19);

  // Subtitle / Date
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // Slate 500
  doc.setFont('helvetica', 'normal');
  doc.text(`Relatório Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 14, 19, { align: 'right' });

  // Divider
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.line(14, 28, pageWidth - 14, 28);

  // --- SUMMARY SECTION ---
  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalInvestments = investments.reduce((acc, curr) => acc + curr.amount, 0);
  const balance = totalIncome - totalExpenses;

  let yPos = 45;

  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Resumo Financeiro', 14, yPos);

  yPos += 10;

  // Draw Summary Cards (Rectangles)
  const cardWidth = (pageWidth - 28 - 15) / 4; // Adjusted for 4 cards roughly, or stick to 3 main ones
  const cardHeight = 24;
  
  // To keep layout clean, we'll display Income, Expense, Investments Side by Side
  // Income Card
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Renda Total', 18, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, yPos + 18);

  // Expense Card
  const xPos2 = 14 + cardWidth + 5;
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(xPos2, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Despesas Totais', xPos2 + 4, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(190, 18, 60); // Rose 700
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, xPos2 + 4, yPos + 18);

  // Investment Card
  const xPos3 = xPos2 + cardWidth + 5;
  doc.setFillColor(239, 246, 255); // Blue 50
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(xPos3, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Invest. Mensais', xPos3 + 4, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(29, 78, 216); // Blue 700
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${totalInvestments.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, xPos3 + 4, yPos + 18);

  // Balance Card
  const xPos4 = xPos3 + cardWidth + 5;
  const balanceColor = balance >= 0 ? [21, 128, 61] : [190, 18, 60];
  const balanceBg = balance >= 0 ? [240, 253, 244] : [255, 241, 242];
  
  doc.setFillColor(balanceBg[0], balanceBg[1], balanceBg[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(xPos4, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo (Renda - Desp.)', xPos4 + 4, yPos + 8);
  doc.setFontSize(12);
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, xPos4 + 4, yPos + 18);

  yPos += 35;

  // --- 1. INCOMES TABLE ---
  if (incomes.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento de Rendas', 14, yPos);

    const incomeRows = incomes.map(inc => [
        inc.personName,
        inc.description || '-',
        `R$ ${inc.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Nome', 'Descrição', 'Valor']],
        body: incomeRows,
        theme: 'grid',
        headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
        2: { halign: 'right', fontStyle: 'bold', textColor: [21, 128, 61] }
        }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;
  }

  // --- 2. EXPENSES TABLE ---
  if (expenses.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento de Despesas', 14, yPos);

    const expenseRows = expenses.map(exp => [
        exp.name,
        exp.category,
        exp.type === 'FIXED' ? 'Fixa' : 'Variável',
        new Date(exp.date).toLocaleDateString('pt-BR'),
        `R$ ${exp.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Descrição', 'Categoria', 'Tipo', 'Data', 'Valor']],
        body: expenseRows,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' }, // Rose 600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            4: { halign: 'right', fontStyle: 'bold', textColor: [190, 18, 60] }
        }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;
  }

  // --- 3. INVESTMENTS TABLE ---
  if (investments.length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('Investimentos Recorrentes (Mensal)', 14, yPos);

    const invRows = investments.map(inv => [
        inv.name,
        inv.category,
        inv.annualRate > 0 ? `${inv.annualRate}% a.a.` : '-',
        `R$ ${inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Ativo', 'Categoria', 'Rentabilidade Est.', 'Aporte Mensal']],
        body: invRows,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' }, // Blue 600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            3: { halign: 'right', fontStyle: 'bold', textColor: [29, 78, 216] }
        }
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15;
  }

  // --- 4. SCHEDULED EVENTS TABLE ---
  if (scheduledEvents.length > 0) {
    // Check if we need a new page
    if (yPos > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('Eventos Sazonais e Aportes Únicos', 14, yPos);

    const eventRows = scheduledEvents
        .sort((a, b) => {
            if (a.year !== b.year && a.year && b.year) return a.year - b.year;
            return a.month - b.month;
        })
        .map(evt => [
            evt.name,
            `${MONTHS[evt.month]} ${evt.year ? `(${evt.year})` : ''}`,
            evt.type === 'INJECTION' ? 'Entrada / Aporte' : 'Saída / Gasto',
            `R$ ${evt.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
        ]);

    autoTable(doc, {
        startY: yPos + 5,
        head: [['Descrição', 'Período', 'Tipo', 'Valor']],
        body: eventRows,
        theme: 'grid',
        headStyles: { fillColor: [147, 51, 234], textColor: 255, fontStyle: 'bold' }, // Purple 600
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
            2: { textColor: 100 }, // Slate color for type text
            3: { halign: 'right', fontStyle: 'bold' }
        },
        didParseCell: (data) => {
            // Color logic for amount column (index 3) based on type (index 2 in data array, but accessible via raw data row)
            if (data.section === 'body' && data.column.index === 3) {
                const rowRaw = data.row.raw as any[];
                const typeStr = rowRaw[2] as string;
                if (typeStr.includes('Entrada')) {
                    data.cell.styles.textColor = [5, 150, 105]; // Green
                } else {
                    data.cell.styles.textColor = [225, 29, 72]; // Red
                }
            }
        }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, pageWidth - 20, doc.internal.pageSize.height - 10, { align: 'right' });
      doc.text('BudgetFlow AI - Seu organizador financeiro inteligente', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`orcamento-completo-${new Date().toISOString().split('T')[0]}.pdf`);
};