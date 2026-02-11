
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { JobOrder, ProductSpec } from '../types';

export const generateJobOrderPDF = async (order: JobOrder): Promise<Uint8Array> => {
  console.log("Starting PDF Generation...");

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // A4 Size Points (595.28 x 841.89)
    const PAGE_WIDTH = 595.28;
    const PAGE_HEIGHT = 841.89;
    
    // Increased Margin to scale content down and provide header/footer space
    const MARGIN = 45; 
    const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

    // --- SPACING CONFIGURATION ---
    const SPACING = {
        TITLE_TO_COMPANY: 15, 
        COMPANY_TO_CUSTOMER: 5,
        SKU_TO_SECTION_A: 5,
        SECTION_A_GROUP_GAP: 8, 
        SECTION_A_WEIGHT_GAP: 10
    };

    // Font Sizes (Compact)
    const S_TEXT = 8; 
    const S_BOLD = 8;
    const S_HEADER = 10;
    const S_SMALL = 7;
    const S_TINY = 6;
    
    // Checkbox Dimensions
    const CB_W = 8;
    const CB_H = 8;

    // --- Helpers ---
    const safeStr = (val: any, maxLength: number = 100): string => {
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return '';
        let str = String(val);
        if (str === 'NaN' || str === 'undefined' || str === 'null') return '';
        if (str.length > maxLength) return str.substring(0, maxLength) + '...';
        return str;
    };

    const sanitize = (text: string): string => text ? text.replace(/[^\x20-\x7E\n]/g, '') : '';

    const formatDate = (dateStr: string | undefined) => {
        if (!dateStr) return '';
        // Handle YYYY-MM-DD string from input type="date" or ISO string
        if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
            const [year, month, day] = dateStr.split('T')[0].split('-');
            return `${day}-${month}-${year}`;
        }
        return dateStr;
    };

    const drawText = (page: any, text: any, x: number, y: number, size: number = S_TEXT, isBold: boolean = false, align: 'left' | 'center' | 'right' = 'left') => {
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        const f = isBold ? boldFont : font;
        let str = safeStr(text); 
        str = sanitize(str);

        let xPos = x;
        try {
            const width = f.widthOfTextAtSize(str, size);
            if (align === 'center') xPos = x - width / 2;
            else if (align === 'right') xPos = x - width;
            
            page.drawText(str, { x: xPos, y, size, font: f, color: rgb(0,0,0) });
        } catch (e) {
            console.warn('Error drawing text:', str, e);
        }
    };

    const drawBox = (page: any, x: number, y: number, w: number, h: number) => {
        page.drawRectangle({ x, y, width: w, height: h, borderColor: rgb(0,0,0), borderWidth: 0.5, opacity: 0, borderOpacity: 1 });
    };

    const drawFilledBox = (page: any, x: number, y: number, w: number, h: number, color: any) => {
        page.drawRectangle({ x, y, width: w, height: h, color, borderWidth: 0 });
    };

    const drawLine = (page: any, x1: number, y1: number, x2: number, y2: number) => {
        page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color: rgb(0,0,0) });
    };

    const drawTick = (page: any, x: number, y: number, w: number = CB_W, h: number = CB_H) => {
        // Draw a slash (/)
        const pad = 1;
        drawLine(page, x + pad, y + pad, x + w - pad, y + h - pad);
    };

    const drawFooter = (page: any) => {
        const fy = 25;
        drawText(page, 'FM-FIN-03 Rev:2, 10th Feb 2026', MARGIN, fy + 16, S_TINY);
        drawText(page, 'Ref WI-SM-01, DCM', MARGIN, fy + 8, S_TINY);
        drawText(page, 'HALAGEL GROUP OF COMPANIES', MARGIN, fy, S_TINY);
    };

    const base64ToUint8Array = (base64: string) => {
        try {
            if (!base64) return new Uint8Array(0);
            const data = base64.includes('base64,') ? base64.split('base64,')[1] : base64;
            const binaryString = window.atob(data);
            const len = binaryString.length;
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            return bytes;
        } catch (e) { return new Uint8Array(0); }
    };

    // --- PAGE 1: SALES (SECTION A) ---
    const page1 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    // Start lower to give header space
    let y = PAGE_HEIGHT - 50; 

    // 0. LOGO
    const logoBase64Data = "data:image/png;base64,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";
    
    // 1. HEADER & LOGO
    if (logoBase64Data) {
        try {
            const logoBytes = base64ToUint8Array(logoBase64Data);
            if (logoBytes.length > 0) {
                const pngImage = await pdfDoc.embedPng(logoBytes);
                // const scaled = pngImage.scale(0.8); 
                page1.drawImage(pngImage, {
                    x: MARGIN,
                    y: y - 10,
                    width: 90, // Slightly smaller logo
                    height: 30,
                });
            }
        } catch (err) { console.error("Logo error", err); }
    }

    drawText(page1, 'HALAGEL GROUP OF COMPANIES', PAGE_WIDTH / 2, y, 12, true, 'center');
    y -= 12;
    drawText(page1, 'JOB ORDER', PAGE_WIDTH / 2, y, 9, false, 'center');
    
    // 2. COMPANY CHECKBOXES
    y -= SPACING.TITLE_TO_COMPANY;
    
    const companies = ['Halagel Plant (M) Sdn Bhd', 'Halagel Products Sdn Bhd', 'Halagel Malaysia Sdn Bhd'];
    let compX = MARGIN;
    const compW = (CONTENT_WIDTH - 20) / 3;
    
    companies.forEach((comp, idx) => {
        // Draw underline for text
        const textWidth = font.widthOfTextAtSize(comp, S_SMALL);
        drawBox(page1, compX, y, CB_W, CB_H);
        if (order.company === comp) drawTick(page1, compX, y);
        
        drawText(page1, comp, compX + CB_W + 5, y + 1, S_SMALL);
        // Underline
        drawLine(page1, compX + CB_W + 5, y, compX + CB_W + 5 + textWidth, y);
        
        // Dynamic spacing
        if(idx < 2) compX += compW + 10;
    });

    // 3. CUSTOMER / PO / SKU BLOCK
    y -= SPACING.COMPANY_TO_CUSTOMER;
    
    // Row 1: Customer & PO
    const rowH1 = 20; // Reduced height
    const col1W = CONTENT_WIDTH * 0.65; 
    const textOffset1 = (rowH1 / 2) - 3;

    drawBox(page1, MARGIN, y - rowH1, col1W, rowH1);
    drawText(page1, 'CUSTOMER NAME :', MARGIN + 5, y - textOffset1 - 4, S_TEXT);
    drawText(page1, order.customerName, MARGIN + 100, y - textOffset1 - 4, S_BOLD, true);

    drawBox(page1, MARGIN + col1W, y - rowH1, CONTENT_WIDTH - col1W, rowH1); 
    drawText(page1, 'PO NUMBER :', MARGIN + col1W + 5, y - textOffset1 - 4, S_TEXT);
    drawText(page1, order.poNumber, MARGIN + col1W + 70, y - textOffset1 - 4, S_BOLD, true);

    y -= rowH1;
    
    // Row 2: SKU & Delivery Date (Merged Box)
    const rowH2 = 20; 
    const textOffset2 = (rowH2 / 2) - 3;
    const boxY2 = y - (rowH2 / 2) - (CB_H / 2);

    // Single continuous box
    drawBox(page1, MARGIN, y - rowH2, CONTENT_WIDTH, rowH2);
    
    // SKU Section - Grouped Left
    // Shifted starting position left to accommodate 3 items
    let currentX = MARGIN + 10; 
    
    // Existing
    drawText(page1, 'EXISTING SKU', currentX, y - textOffset2 - 4, S_TEXT);
    currentX += 75;
    drawBox(page1, currentX, boxY2, CB_W, CB_H);
    if (order.skuType === 'Existing') drawTick(page1, currentX, boxY2);
    
    // New
    currentX += 25; 
    drawText(page1, 'NEW SKU', currentX, y - textOffset2 - 4, S_TEXT);
    currentX += 50;
    drawBox(page1, currentX, boxY2, CB_W, CB_H);
    if (order.skuType === 'New') drawTick(page1, currentX, boxY2);

    // Trial
    currentX += 25; 
    drawText(page1, 'TRIAL', currentX, y - textOffset2 - 4, S_TEXT);
    currentX += 35;
    drawBox(page1, currentX, boxY2, CB_W, CB_H);
    if (order.skuType === 'Trial') drawTick(page1, currentX, boxY2);

    // Date Section - Right side
    const dateLabel = 'ESTIMATE DELIVERY DATE :';
    const dateLabelW = font.widthOfTextAtSize(dateLabel, S_TEXT);
    const dateX = MARGIN + CONTENT_WIDTH - 150 - dateLabelW; // Position from right
    
    drawText(page1, dateLabel, dateX, y - textOffset2 - 4, S_TEXT);
    drawText(page1, formatDate(order.estDeliveryDate), dateX + dateLabelW + 10, y - textOffset2 - 4, S_BOLD, true);
    // REMOVED Underline for date value to match Customer Name / PO Number style
    // drawLine(page1, dateX + dateLabelW + 5, y - 8, MARGIN + CONTENT_WIDTH - 5, y - 8);

    y -= rowH2;

    y -= SPACING.SKU_TO_SECTION_A; // Controlled gap before Section A

    // --- SECTION A HEADER ---
    const sectionHeaderH = 14;
    
    drawFilledBox(page1, MARGIN, y - sectionHeaderH, CONTENT_WIDTH, sectionHeaderH, rgb(0.9, 0.9, 0.9));
    drawBox(page1, MARGIN, y - sectionHeaderH, CONTENT_WIDTH, sectionHeaderH); 
    drawText(page1, 'SECTION A (To be completed by Sales Representative)', PAGE_WIDTH / 2, y - 10, S_TEXT, true, 'center');
    
    y -= sectionHeaderH; 
    const sectionAContentTopY = y;
    const colWidth = CONTENT_WIDTH / 2;
    
    // --- COLUMN RENDERER ---
    const drawContentColumn = (startX: number, data: ProductSpec | undefined): number => {
        let cy = sectionAContentTopY - 10;
        const innerX = startX + 5; 
        const contentW = colWidth - 10;
        const p: any = data || {};

        // A. PRODUCT DETAIL
        drawText(page1, 'A. PRODUCT DETAIL', innerX, cy, S_BOLD, true);
        cy -= 12; 
        
        drawText(page1, 'PRODUCT NAME :', innerX, cy, S_TEXT);
        drawLine(page1, innerX + 85, cy, innerX + contentW, cy);
        drawText(page1, p.productName || '', innerX + 87, cy + 2, S_TEXT);
        
        cy -= 15;
        
        drawText(page1, 'QUANTITY ORDER :', innerX, cy - 3, S_TEXT);
        
        const tblX = innerX + 90;
        const tblW = contentW - 90;
        const tblRowH = 11;
        const rows = ['Bottle', 'Blister', 'Box', 'Tube', 'Others'];
        
        let ty = cy + 4; 
        rows.forEach(row => {
            drawBox(page1, tblX, ty - tblRowH, 50, tblRowH);
            drawText(page1, row, tblX + 2, ty - 8, S_SMALL);
            drawBox(page1, tblX + 50, ty - tblRowH, tblW - 50, tblRowH);
            if (p.unitType === row) {
                drawText(page1, String(p.orderQuantity || ''), tblX + 55, ty - 8, S_SMALL);
            }
            ty -= tblRowH;
        });
        
        cy = ty - 8;

        // B. PRODUCT SPECIFICATION
        drawText(page1, 'B. PRODUCT SPECIFICATION (PLEASE TICK /)', innerX, cy, S_BOLD, true);
        cy -= 10;

        const drawSpecGroup = (label: string, items: string[], selection: string[], othersText?: string) => {
            drawText(page1, label, innerX, cy, S_SMALL);
            const bx = innerX + 90;
            let by = cy + 2;
            const safeSelection = selection || []; 
            items.forEach(item => {
                drawBox(page1, bx, by - CB_H, CB_W, CB_H);
                if (safeSelection.includes(item)) drawTick(page1, bx, by - CB_H);
                drawText(page1, item, bx + CB_W + 5, by - 7, S_SMALL); 
                by -= 10;
            });
            // Others
            drawBox(page1, bx, by - CB_H, CB_W, CB_H);
            if (safeSelection.includes('Others')) drawTick(page1, bx, by - CB_H);
            drawText(page1, 'Others :', bx + CB_W + 5, by - 7, S_SMALL);
            drawLine(page1, bx + CB_W + 35, by - 8, innerX + contentW, by - 8);
            if (safeSelection.includes('Others') && othersText) {
                drawText(page1, othersText, bx + CB_W + 40, by - 7, S_SMALL);
            }
            by -= 10; 
            return by;
        };

        cy = drawSpecGroup('PRODUCT CATEGORY', 
            ['Traditional & Health Supplement', 'Toothpaste & Cosmetics', 'Food & Beverages'], 
            p.categories, p.categoriesOthers);
        cy -= SPACING.SECTION_A_GROUP_GAP;
            
        cy = drawSpecGroup('PRODUCT TYPE', 
            ['Softgel', 'Hard Capsule', 'Toothpaste', 'Liquid', 'Cosmetics', 'Food'], 
            p.productTypes, p.productTypesOthers);
        cy -= SPACING.SECTION_A_GROUP_GAP;
            
        cy = drawSpecGroup('PACKING TYPE', 
            ['HDPE White Bottle', 'Amber Glass Bottle', 'PET Amber Glass Bottle'], 
            p.packingTypes, p.packingTypesOthers);

        // Gap before weight
        cy -= SPACING.SECTION_A_WEIGHT_GAP;

        drawText(page1, 'WEIGHT / ITEM', innerX, cy, S_SMALL);
        drawBox(page1, innerX + 90, cy - 2, contentW - 90, 10);
        drawText(page1, p.weightPerItem || '', innerX + 93, cy, S_SMALL);
        
        cy -= 14;
        const qtyRows = [
            {l: 'QUANTITY PER BOTTLE', v: p.qtyPerBottle},
            {l: 'QUANTITY PER BLISTER', v: p.qtyPerBlister},
            {l: 'QUANTITY PER BOX / SET', v: p.qtyPerBoxSet},
            {l: 'QUANTITY PER CARTON', v: p.qtyPerCarton},
        ];
        qtyRows.forEach(q => {
            drawText(page1, q.l, innerX, cy, S_SMALL);
            drawBox(page1, innerX + 110, cy - 2, contentW - 110, 10);
            drawText(page1, q.v || '', innerX + 113, cy, S_SMALL);
            cy -= 11;
        });

        // C. REQUIREMENT
        cy -= 6;
        drawText(page1, 'C. REQUIREMENT (PLEASE TICK /)', innerX, cy, S_BOLD, true);
        cy -= 10;
        
        const reqLabelW = 85;
        // Space for "Customer" + box + gap + "Halagel" + box
        const c1X = innerX + reqLabelW; 
        const c2X = c1X + 65; 
        
        const supplySource = p.supplySource || {};
        
        // Items to display in the requirement section (excluding 'others')
        const reqItems = [
            {k: 'rawMaterial', l: 'RAW MATERIAL:'}, {k: 'bottle', l: 'BOTTLE:'},
            {k: 'labeling', l: 'LABELLING:'}, {k: 'innerBox', l: 'INNER BOX:'},
            {k: 'cap', l: 'CAP:'}, {k: 'capSeal', l: 'CAP SEAL:'},
            {k: 'stopper', l: 'STOPPER:'}, {k: 'pvcFoil', l: 'PVC FOIL:'},
            {k: 'alumFoil', l: 'ALUMINIUM FOIL:'}, {k: 'shrinkwrap', l: 'PVC SHRINKWRAP:'},
            {k: 'carton', l: 'CARTON:'}, {k: 'insert', l: 'INSERT:'},
        ];

        reqItems.forEach(item => {
            drawText(page1, item.l, innerX, cy, S_SMALL);
            
            drawBox(page1, c1X, cy - 2, CB_W, CB_H);
            drawText(page1, 'Customer', c1X + 12, cy, S_TINY); 
            // @ts-ignore
            if (supplySource[item.k] === 'Customer') drawTick(page1, c1X, cy - 2);
            
            drawBox(page1, c2X, cy - 2, CB_W, CB_H);
            drawText(page1, 'Halagel', c2X + 12, cy, S_TINY);
            // @ts-ignore
            if (supplySource[item.k] === 'Halagel') drawTick(page1, c2X, cy - 2);
            
            cy -= 10;
        });

        // Others
        drawText(page1, 'OTHERS :', innerX, cy, S_SMALL);
        drawBox(page1, c1X, cy - 2, CB_W, CB_H);
        drawText(page1, 'Customer', c1X + 12, cy, S_TINY);
        if (supplySource.others === 'Customer') drawTick(page1, c1X, cy - 2);
        
        drawBox(page1, c2X, cy - 2, CB_W, CB_H);
        drawText(page1, 'Halagel', c2X + 12, cy, S_TINY);
        if (supplySource.others === 'Halagel') drawTick(page1, c2X, cy - 2);

        // REMARKS WITH BOX
        cy -= 15;
        drawText(page1, 'REMARKS:', innerX, cy, S_BOLD, true);
        cy -= 5;
        const remarksBoxH = 30;
        drawBox(page1, innerX, cy - remarksBoxH, contentW, remarksBoxH);
        // Draw Remarks text inside box
        drawText(page1, p.remarks || '', innerX + 3, cy - 10, S_SMALL);

        return cy - remarksBoxH - 8; 
    };

    // Draw Columns
    const endY1 = drawContentColumn(MARGIN, order);
    const endY2 = drawContentColumn(PAGE_WIDTH / 2, order.product2); 

    // --- SIGNATURES (Page 1) ---
    const sigBoxHeight = 65; // Compact height
    const lowestContentY = Math.min(endY1, endY2);
    
    // Ensure we don't overlap, but try to stick signature block nicely
    let sY = lowestContentY - sigBoxHeight - 8;
    // Check bottom margin limit (e.g. at least 40 from bottom)
    if (sY < MARGIN) sY = MARGIN; 

    // Vertical Divider for Columns
    drawLine(page1, PAGE_WIDTH / 2, sectionAContentTopY, PAGE_WIDTH / 2, sY + sigBoxHeight);
    
    // Outer Box for Content
    const contentHeight = sectionAContentTopY - (sY + sigBoxHeight);
    drawBox(page1, MARGIN, sY + sigBoxHeight, CONTENT_WIDTH, contentHeight);

    // Signature Block Main Box
    drawBox(page1, MARGIN, sY, CONTENT_WIDTH, sigBoxHeight);
    const sigW = CONTENT_WIDTH / 2;

    // Split Sales Executive and Sales Manager
    drawLine(page1, MARGIN + sigW, sY, MARGIN + sigW, sY + sigBoxHeight);
    
    // Gray Header Bars for Signatures
    const sigHeaderH = 15;
    drawFilledBox(page1, MARGIN, sY + sigBoxHeight - sigHeaderH, sigW, sigHeaderH, rgb(0.9, 0.9, 0.9));
    drawFilledBox(page1, MARGIN + sigW, sY + sigBoxHeight - sigHeaderH, sigW, sigHeaderH, rgb(0.9, 0.9, 0.9));

    // Headers Box Border (Horizontal line separating header)
    const sigLineY = sY + sigBoxHeight - sigHeaderH;
    drawLine(page1, MARGIN, sigLineY, MARGIN + CONTENT_WIDTH, sigLineY);

    const nameLineY = sY + 25;
    const dateLineY = sY + 12;

    // Horizontal lines for Name/Date
    drawLine(page1, MARGIN, nameLineY, MARGIN + CONTENT_WIDTH, nameLineY); // Name separator
    drawLine(page1, MARGIN, dateLineY, MARGIN + CONTENT_WIDTH, dateLineY); // Date separator

    const drawSigCell = (x: number, title: string, name: string | undefined, date: string | undefined) => {
        // Title centered in top box
        drawText(page1, title, x + (sigW / 2), sY + sigBoxHeight - 11, S_BOLD, true, 'center');
        
        drawText(page1, 'Name :', x + 3, nameLineY - 8, S_TINY);
        drawText(page1, name || '', x + 30, nameLineY - 8, S_SMALL);
        drawText(page1, 'Date :', x + 3, dateLineY - 8, S_TINY);
        drawText(page1, formatDate(date), x + 30, dateLineY - 8, S_SMALL);
    };

    drawSigCell(MARGIN, 'Prepared by ( Sales Executive )', order.salesPreparedBy, order.salesDate);
    // Approved by Sales Manager - Empty input as per request
    drawSigCell(MARGIN + sigW, 'Approved by ( Sales Manager )', '', '');

    drawFooter(page1);

    // --- PAGE 2: PLANNER (SECTION B) ---
    const page2 = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let py = PAGE_HEIGHT - 50; // Match P1 header start

    const sectionBHeaderH = 18;
    drawFilledBox(page2, MARGIN, py - sectionBHeaderH, CONTENT_WIDTH, sectionBHeaderH, rgb(0.9, 0.9, 0.9));
    drawBox(page2, MARGIN, py - sectionBHeaderH, CONTENT_WIDTH, sectionBHeaderH);
    drawText(page2, 'SECTION B (To be completed by Planner )', PAGE_WIDTH / 2, py - 12, S_HEADER, true, 'center');

    py -= (sectionBHeaderH + 15);
    
    // Planner Info
    drawText(page2, 'JOB ORDER NO :', MARGIN + 20, py, S_TEXT, true);
    drawBox(page2, MARGIN + 100, py - 4, 200, 16);
    drawText(page2, order.jobOrderNo, MARGIN + 105, py, S_TEXT);

    drawText(page2, 'Date:', MARGIN + 320, py, S_TEXT);
    drawBox(page2, MARGIN + 350, py - 4, 130, 16);
    drawText(page2, formatDate(order.sectionBDate), MARGIN + 355, py, S_TEXT);

    py -= 25;
    
    // Materials Table
    const tX = MARGIN;
    const colWidths = [50, 125, 80, 80, 80, 90]; 
    const headers = ['Item Code', 'Raw @ Packaging Material', 'Quantity Required\n(kg/pcs)', 'Stock Balance\n(kg/pcs)', 'Quantity to Order\n(kg/pcs)', 'PR No'];
    
    const headerH = 28;
    drawFilledBox(page2, tX, py - headerH, CONTENT_WIDTH, headerH, rgb(0.85, 0.85, 0.85));
    drawBox(page2, tX, py - headerH, CONTENT_WIDTH, headerH);

    let currX = tX;
    headers.forEach((h, i) => {
        const cw = (i === headers.length - 1) ? (CONTENT_WIDTH - (currX - tX)) : colWidths[i];
        
        drawBox(page2, currX, py - headerH, cw, headerH);
        
        const lines = h.split('\n');
        const fontSize = 8; // Increased from S_TINY (6)
        const lineGap = 10;
        
        // Vertical centering logic for 28pt high box
        let hy = py - 13; 
        if (lines.length > 1) hy = py - 9;

        lines.forEach((l, idx) => {
            drawText(page2, l, currX + (cw / 2), hy - (idx * lineGap), fontSize, true, 'center'); 
        });
        currX += cw;
    });
    
    py -= headerH;

    const rowHeight = 16; 
    const numRows = 25;
    
    for (let i = 0; i < numRows; i++) {
        const mat = order.materials && order.materials[i];
        currX = tX;
        headers.forEach((_, idx) => { // Use headers length to iterate columns
            const cw = (idx === headers.length - 1) ? (CONTENT_WIDTH - (currX - tX)) : colWidths[idx];
            
            drawBox(page2, currX, py - rowHeight, cw, rowHeight);
            if (mat) {
                let val = '';
                if(idx===0) val = mat.itemCode;
                if(idx===1) val = mat.materialName;
                if(idx===2) val = String(mat.qtyRequired);
                if(idx===3) val = String(mat.stockBalance);
                if(idx===4) val = String(mat.qtyToOrder);
                if(idx===5) val = mat.prNo;
                
                drawText(page2, val, currX + 3, py - 11, S_TEXT, idx === 4);
            }
            currX += cw;
        });
        py -= rowHeight;
    }

    py -= 12;
    drawText(page2, 'Remarks:', MARGIN, py, S_TEXT, true);
    
    const remarksGap = 5;
    const remarksBoxH2 = 50;
    const remarksBoxBottom = py - remarksGap - remarksBoxH2;

    drawBox(page2, MARGIN, remarksBoxBottom, CONTENT_WIDTH, remarksBoxH2);
    drawText(page2, order.remarks, MARGIN + 5, py - remarksGap - 10, S_TEXT, false, 'left'); 
    
    py = remarksBoxBottom - 15;

    // Page 2 Signatures - 4 Columns: Prepared, Reviewed, Approved, Received
    const sigH2 = 100; // Increased height to prevent overlap
    const sW2 = CONTENT_WIDTH / 4; 
    
    const nY2 = py - sigH2 + 35; // Moved up slightly
    const dY2 = py - sigH2 + 15; 
    
    // Header Logic
    const sigHeaderH2 = 30; // Increased height to accommodate 2 lines
    const sY2Line = py - sigHeaderH2; 

    // Gray Header Backgrounds
    for(let i=0; i<4; i++) {
        drawFilledBox(page2, MARGIN + i*sW2, py - sigHeaderH2, sW2, sigHeaderH2, rgb(0.9, 0.9, 0.9));
    }
    // Redraw box borders over filled backgrounds for crispness
    drawBox(page2, MARGIN, py - sigH2, CONTENT_WIDTH, sigH2);
    drawLine(page2, MARGIN + sW2, py, MARGIN + sW2, py - sigH2);
    drawLine(page2, MARGIN + 2*sW2, py, MARGIN + 2*sW2, py - sigH2);
    drawLine(page2, MARGIN + 3*sW2, py, MARGIN + 3*sW2, py - sigH2);
    drawLine(page2, MARGIN, sY2Line, MARGIN + CONTENT_WIDTH, sY2Line);

    // Name/Date Lines
    drawLine(page2, MARGIN, nY2, MARGIN + CONTENT_WIDTH, nY2);
    drawLine(page2, MARGIN, dY2, MARGIN + CONTENT_WIDTH, dY2);

    const drawSigCell2 = (idx: number, titleLines: string[], name: string | undefined, date: string | undefined) => {
        const x = MARGIN + (idx * sW2);
        
        // Center Title (multiline support)
        let tY = py - 18;
        if (titleLines.length > 1) tY = py - 12;
        
        titleLines.forEach((line, lineIdx) => {
             const tw = boldFont.widthOfTextAtSize(line, S_SMALL);
             const tx = x + (sW2 - tw) / 2;
             // Increased line spacing slightly
             drawText(page2, line, tx, tY - (lineIdx * 10), S_SMALL, true);
        });

        drawText(page2, 'Name :', x + 3, nY2 - 8, S_TINY);
        drawText(page2, name || '', x + 30, nY2 - 8, S_SMALL);
        drawText(page2, 'Date :', x + 3, dY2 - 8, S_TINY);
        drawText(page2, formatDate(date), x + 30, dY2 - 8, S_SMALL);
    };

    drawSigCell2(0, ['Prepared by', '( Production Planner )'], order.plannerPreparedBy, order.plannerPreparedDate);
    drawSigCell2(1, ['Reviewed by', '( Production Manager )'], order.plannerReviewedBy, order.plannerReviewedDate);
    drawSigCell2(2, ['Approved by', '( Plant Manager )'], order.plannerApprovedBy, order.plannerApprovedDate);
    drawSigCell2(3, ['Received by', '( Production HOD )'], order.plannerReceivedBy, order.plannerReceivedDate);

    py -= sigH2 + 12;
    
    // Final Status Section
    drawLine(page2, MARGIN, py, PAGE_WIDTH - MARGIN, py);
    drawLine(page2, MARGIN, py - 2, PAGE_WIDTH - MARGIN, py - 2);
    
    py -= 15;
    drawText(page2, 'Date of Job Order completion :', MARGIN, py, S_TEXT);
    drawBox(page2, MARGIN + 140, py - 4, 100, 14);
    drawText(page2, formatDate(order.completionDate), MARGIN + 145, py + 1, S_TEXT);

    drawText(page2, 'Quantity delivered :', MARGIN + 260, py, S_TEXT);
    drawBox(page2, MARGIN + 340, py - 4, 100, 14);
    drawText(page2, order.qtyDelivered, MARGIN + 345, py + 1, S_TEXT);

    py -= 20;
    drawText(page2, 'Status of Job Order:', MARGIN, py, S_TEXT);
    
    const statusBoxW = CB_W + 4; // 12
    const statusBoxH = 12;

    drawBox(page2, MARGIN + 140, py - 2, statusBoxW, statusBoxH);
    if(order.finalStatus === 'Closed') drawTick(page2, MARGIN + 140, py - 2, statusBoxW, statusBoxH); 
    drawText(page2, 'Closed', MARGIN + 160, py + 1, S_TEXT);

    drawBox(page2, MARGIN + 260, py - 2, statusBoxW, statusBoxH);
    if(order.finalStatus === 'Pending') drawTick(page2, MARGIN + 260, py - 2, statusBoxW, statusBoxH); 
    drawText(page2, 'Pending', MARGIN + 280, py + 1, S_TEXT);

    py -= 20;
    drawText(page2, 'Reason of pending :', MARGIN, py, S_TEXT);
    drawLine(page2, MARGIN + 100, py - 2, PAGE_WIDTH - MARGIN, py - 2);
    drawText(page2, order.pendingReason, MARGIN + 105, py, S_TEXT);

    drawFooter(page2);

    console.log("PDF Generation Complete.");
    return await pdfDoc.save();
  } catch(error) {
    console.error("Critical PDF Error:", error);
    throw error;
  }
};
