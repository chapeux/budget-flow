import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Income, Expense } from '../types';

export const generateBudgetPDF = (incomes: Income[], expenses: Expense[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Colors
  const primaryColor = [5, 150, 105]; // Emerald 600
  const slateColor = [51, 65, 85]; // Slate 700

  // --- HEADER & LOGO ---
  // Draw a simple "logo" (Green rounded square)
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.roundedRect(14, 10, 12, 12, 2, 2, 'F');
  
  // Draw a simple "wallet" icon representation inside the box
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.line(17, 16, 23, 16); // horizontal line
  doc.circle(20, 16, 0.5, 'S'); // dot

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
  const balance = totalIncome - totalExpenses;

  let yPos = 45;

  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('Resumo Financeiro', 14, yPos);

  yPos += 10;

  // Draw Summary Cards (Rectangles)
  const cardWidth = (pageWidth - 28 - 10) / 3;
  const cardHeight = 24;
  
  // Income Card
  doc.setFillColor(240, 253, 244); // Green 50
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Renda Total', 18, yPos + 8);
  doc.setFontSize(14);
  doc.setTextColor(21, 128, 61); // Green 700
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18, yPos + 18);

  // Expense Card
  doc.setFillColor(255, 241, 242); // Rose 50
  doc.setDrawColor(254, 205, 211);
  doc.roundedRect(14 + cardWidth + 5, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Despesas Totais', 18 + cardWidth + 5, yPos + 8);
  doc.setFontSize(14);
  doc.setTextColor(190, 18, 60); // Rose 700
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18 + cardWidth + 5, yPos + 18);

  // Balance Card
  const balanceColor = balance >= 0 ? [21, 128, 61] : [190, 18, 60];
  const balanceBg = balance >= 0 ? [240, 253, 244] : [255, 241, 242];
  
  doc.setFillColor(balanceBg[0], balanceBg[1], balanceBg[2]);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14 + (cardWidth + 5) * 2, yPos, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.text('Saldo Final', 18 + (cardWidth + 5) * 2, yPos + 8);
  doc.setFontSize(14);
  doc.setTextColor(balanceColor[0], balanceColor[1], balanceColor[2]);
  doc.setFont('helvetica', 'bold');
  doc.text(`R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 18 + (cardWidth + 5) * 2, yPos + 18);

  yPos += 35;

  // --- TABLES ---

  // 1. Incomes Table
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

  // @ts-ignore - autoTable adds lastAutoTable to doc
  yPos = doc.lastAutoTable.finalY + 20;

  // 2. Expenses Table
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
    headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold' }, // Rose 600 header
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
        4: { halign: 'right', fontStyle: 'bold', textColor: [190, 18, 60] }
    }
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text('BudgetFlow AI - Seu organizador financeiro inteligente', pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
  }

  doc.save(`orcamento-completo-${new Date().toISOString().split('T')[0]}.pdf`);
};