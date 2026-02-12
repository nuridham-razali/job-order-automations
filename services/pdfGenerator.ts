
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
    const safeStr = (val: any, maxLength: number = 2000): string => {
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

    // Improved Text wrapping helper that strictly respects explicit newlines
    const wrapText = (text: string, maxWidth: number, fontSize: number, fontObj: any): string[] => {
        if (!text) return [];
        
        // 1. Sanitize but keep newlines
        const cleanText = sanitize(text);
        
        // 2. Split into paragraphs by newline
        const paragraphs = cleanText.split('\n');
        const lines: string[] = [];

        paragraphs.forEach(paragraph => {
            // Handle empty paragraphs (explicit double newline) by adding an empty line
            if (paragraph.trim() === '' && paragraph.length === 0) {
                lines.push('');
                return;
            }

            const words = paragraph.split(' ');
            let currentLine = '';

            words.forEach(word => {
                const testLine = currentLine ? `${currentLine} ${word}` : word;
                const width = fontObj.widthOfTextAtSize(testLine, fontSize);
                
                if (width <= maxWidth) {
                    currentLine = testLine;
                } else {
                    // Line is full, push it
                    if (currentLine) lines.push(currentLine);
                    // Start new line with current word, unless word itself is too long (rare)
                    currentLine = word;
                }
            });
            // Push the last accumulated line of the paragraph
            if (currentLine) lines.push(currentLine);
        });
        
        return lines;
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
        const fy = 30; // Bottom position for footer
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
    const logoBase64Data = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAWIAAACOCAYAAAALrQI3AAAQAElEQVR4Aez9B4BlxXUmjn9VdcOLHSbBzJCFUAABEpZlW0KWvfZ67fVv1wrIykLkNCQRBMPMNJOHqIDIWSiB5LRre//rsBKSsyWCQIicJqdOL95Q9f9Ovfd6mmF6gEECZPed+92qOpVOnTp16ty63T0a09e0BKYlMC2BaQm8rhKYNsSvq/inO5+WwLQEpiUATBviaS2YlsC0BP5zSOANPMppQ/wGnpxp1qYlMC2B/xwSmDbE/znmeXqU0xKYlsAbWALThvgNPDnTrE1L4JdPAtMc74kEpg3xnkhtus60BKYlMC2Bn6MEpg3xz1GY001NIQEHBeKkG44KBcfcfcfYzpYWjoA8FLYXIdifcwRW/T5GkJ/NJJYNoQ/9JN2WvHsBjIBUMH952z/JD5Z1/25iM/f8Vbf+/8q9703867/E0nnnP5m84/d81BQwtWHbD69FUH3nXG6gO/dsbq/e9ecPkB/7BgzQGPnnn5/s8SW89Ys2/79DX72NNWz7dm24ZEMOuJf8h6WB88lG4If5JujH5KPER0wg3hw+n64EHmPZyqrc8kM5/4fjbrye9lwfC6JBxZm0SjG5IzLpvnzr7ywNZZVxy05azL3vT0glUH/njBqjf9zYJVb777zFVv+xpx0zmXH3oZ+f7C+Ve8dcF5V73lo5+/+k2///krDnz/uVfu/85zr5y370mrD+qXcb52Uv259DTdyH8wCUwb4v9gE7rb4dArXfDl9/Sdsead886/7Mgjz73syGNOX3b4qede+Z5Fn71o/2tOXvrmuxesfvO/Hj80a/yEpTPc5uKDacOsHR3H02vr2dP31bLH/89Y8sxfj+fP3NjIn7ms7p5fkpjNF6ZmyydTs/VTqdl+TKq2/wat5SGpHtkvM6MzdbEZETCl1otRbiCspESOoJz4UNJBOWO8Q4+qGaKq9fmmlEIXW0DcgovqHuwjJmYRB+Th2DuzYOR3soB8BJs/lQabTqjnz50/nj+7ajx/6svjyRPfriVP/tV49vT3x9NnfzyerH9O2edGNkb/mp66st+dvnKvbaevPuDvF6w65Btnrjr8i2euPOq8z6957yfPu/y3PvqFK3/nnactfPe+Q/Tgdyvj6cxpCeyBBKYN8R4I7Y1a5YI1762eseQt8z5/xdvfd8by/Y75/BUHnHPS0sGvnLi07y8ZPnHu1ftmIxsfHrV287rxdMt9tXTb3TYaubaNjUvj/vbpeTByTKJH3z0wp1SJKwFMIUS5fwClvpkoVmYhKs5CXJxD7O1RKM6HCeYgIEwwyPgAdFAmCtBhABUoZEiQq9TD6gxWoQsNp0IPCw1B7hQEEhc4ZXx6Mq1HlzwBDFXYAC4AELLxQAOBIS/kPwhRLFWJAUTFGYhLMxEVZpP3mSiWZ3BMAyhUizBFh6DkYMrZjBQjv5WobR/n5nJWE89dXrNP3rV5/MffHssf+XFSfOa5p+x96dlffFNy3LK9//XYhbP+7NSl+1551vKDT7vo6nd+5NRFhxx9zlW/Pn/aWHMupu9XJAH9ikpPF37dJXDh6qP6z7v8/QeetfyoY85e8a7TT1/x9us/d/E+/3z+1W9PtjV+OmZLW9Y18ud+kJi1d7f10qsKg40z2mrsD/r3wpuabqse2CtGoV/R+OSIShlsUEcj3YrKYICwZFGsatTbY3AmAwxoIEFjCGRWIcsNUg/FUBOADgzhCE0oKANAO0IBWgFqJ0zkscxEHitJxZeA0gEE2oTowcKB9nuiH03jr8UYhwaKvCV5hiTLyaslNMcSEBFyK4hhNcddLNFAFznuFgZn9gORZd02ogpg4hZmzivAmmGUZuQYmK0wnq4N+2Zk7y7MaPxPF2861xbWf3W49fA9prrx3uHhH699jsb6zNUHDp+x7KD/35nLD11z9oqjFlx8xW///jlD7zvowtW/ww4wfU1L4AUS0C9ITSfeMBI4a8V79jp1xYGHn3/1wad+bnF15eev3u9fT181Z3xT49GRkeZDT9lo090N+/w1Nhw+uTzTvqeRbwuDEg1HFCKMy3C6DGUGkbRjzJk9D6O1nJk0KApI8hZS1YSUj1mn0hejndYAnaLRqsOE2iPJ2jRylnSwLQcdEkEPFipsIccW5GozfIhhGrga0USepwSNLQLAQzMUMKCf7FwK63jMoKwQpoRSira8A+ccBHmes+0OrFNsh4DjptED86R99qOMghjmDiTegRh0aI1226DZ1GiSlWJxECNjTZIL0EEMKVMoV1BnZhAVuBE5bkhAsVShvHL2R687jtGyOUyxCMQas+bPRGVWjNSMDahy87829cYL8sKWL29r/fSvRu3jT47lj4+cc8Vbt3/u4jl/df5Vh604c8VhH12w9NAjzh46cgDT139aCfRWxn9aAbzeAz9p9e/0L1j66+88Z/WvffS4iw5cceKl+/7zgsv2cWPpgxtztf6B4fZT18Z9zYvaavO7daleKc+gIRigQTDjKA5oaDGGpknD20ZUjmgcLHIFlKtc10GEuNyPsUYbYVRCua8frTSBiY03tOP1MbSSNqy1yDILY0IEQeBFopSZZPRoNG3GNMGjBidQPKdFE8okHegMSuUwrG4M22dbRocgY10EzDe+bXkoDaYV28xpQqeGdRl6cOiUgxjvLjp9GXRCxTYdlM49HHlyaLP9tANpy8oGkXGzkDBHkQZU6opBl9ABHRlohSRJkKSsKxuAAlLGo0KRjn6EVpt1SxU4E6E6OAMmLiCx7I1yGmuOwwU53zYSlAdDJGoUhmfkhYEUYbUJGw8PFmekv7+t8eTFTTz17Sxaf39SWD980rK9WqcvP+gvT7r04CUnDx36kTOXvefN08cc+E9x6f8Uo3yDDFIW1YKlhxy9YOXBp56ydP5XT1m29zMqf2CkpX7249H0Z9/u2zu9uDzg3hMUHQqVMjGIcnkvGpl+pLZITzZCUKgQRS50jVbeRlAM6aWlCOIAhp5sDhoOGqCcBqjeHEWzPY6oYFimTa94FCYKsX1kDEFUQKHUhyjso6GLEYRlZDx2MHSTmy1LQwVEMY1OYKADBRXQczUpECQ0Pk04LWDaadCyAC6GswEs27BWMwRo3+HosU4Wv1IGSkAvWSkF5eGg2cxkKOUgYCusbn1c0oLJ5bIsQZZl6HjgOaxLiBSOBtfZNhRlAcU0EhrjNqAy0mioaciNAZqtMaYzBPT220ltIkzTFmLKrdEcQ6VSIn8aMpY0yelFp6hW+9BmPEkdmgl4rJFARzFypREWSxBPOofyGx0tN+eJMi4azmELGXlUEVAaiFEZLABRG5mpoTSo4rbe+gdxtTkUlobvqedPPrYlejL93CWz7z/t0gOu+vwVh55w9oq3vUv0CNPXfygJUP3/Q43njTQYdfaSdx953sp3n3ja0FuuP2nxPs+uw8Npojffm2L9taqw9bSwb3z/qK+OiJ5SoT9HI9+OZj6OZtr2i5nrHK3UIixUaQRCGoYy6o0WavU6NI1jSOPrvbQoQsbX43ZbPFTLsinPQxO+QscIw5BGKqdcNB1J5dPVapUGqI52o44sSaHEWGYOIGySoU88PRqYrJ1A0b1WPB92iUHeVsgaBlnTIK9HHmmtAEEyFiMZj9EeC9AaNWiO6EkIPK01EqI9GrHMDmTSTiNG3sEYw9G8GdYYQvJss+Dz0lrIfkLWDXxb0n5jWLE9g+ZoJ2yNa2TkIRuPWDckYoJhg3SCJzLIuclYerPgubHi+XHED3yOxxjtpI6AG5l438VSDG0sPeA2SqUSDW/TyzDg2bOh3J3LIW8RFCoK3KwSyjAMYppdgxatchQWUJc50pS5DmCCwHvWrXaKgMZa3kLCuICcO1XbJtCxQlAkj7qFsOyQmzpsWEOBehFUWygN5kfY4vA5Y61nb6q79T/aVvxZ+rlF1fvPvext15y1+NePOXPJ7+wnvEzjl1cC+peX9TcW5wuG3tN3zmWHH33S4vmfP25oxt+dvmYvWw+euK+O52+0hbGTw6reL6oWuNCKRBlBoQBnNP00jVQpIArhQkIb5kVotlvQ9EZNGKCVNAHtkPG1N45jBEHgjQR4EOHAKVSGeTmcsrBEWAjBo1FYGlaXc4EnQDGqwtGodoxQikhbBJp12LbJWa/VgCVcu4GxrZsYr9Ow0lCPt2HHVd2OmrV2uPQv+bbKt93wrC+r4b2XhuP7LIzq+5xTaM0/vpDO/2gl3ec3+7KDj+rP33RUNT344EJy4D6CsD5vIKjNH9g3e0u4T3pIePPFG1UHm9WNX9ikbrhwo7r+gg2CfoYD15+/qSq0Xp6EN120WQn2TQ8NBcH4/gNzwncODLbfvE+/2v/gwfzAtwzg4KOqOPgD1fSQD5TaB3+01N7/hGB83rlRc+4lQWPGFRgv3apq8V/ouvl31LBZpxqtegPtVhM5N7wm440Gxz82xnPjJmWcckPLCAu+I0CHQMZz7QwNbo6OhrQFS2Ne4JyFTiHjJlmlN+zSjLINucFpyBwoF3CWQsAaaBXRePeh3XawLuabTgirC0gs26ZKWxr7zHBeIiA3jrrBDZIbreK862IBpYFBWM7/wJw5R4wk205vRGvvrgWPPHvSin3dCUv3+bNTV7z5/FOXHn70tNdMYf4S3fqXiNc3FKsLFryn7/MrfvX3jl/8luVnXH7ov21tPzI6lj13bzRYuyLub/y2Ko4h7qe3U2pCF1MaWlrDIIejQbXQXNgBHEIuyjKMifhRzcJxoRbEQDsH7WfGQikHrmiWixhYlmuyXIY4LNCbzRHSCFgu/EIQceValCIuap4J18cTKBsidCUEeQXbNtT5LY5nms0Y41tztEZAwxFt0+nMfx7bpO90yczFZTP3dJUO/nFoZ/1mqGccXIrnzI8y3X/dws2VG4Y27nvTsnW/dsuq5z5284onz7ph1c+WfHXZQyu/uuzBL35l6IFbr1ly/z1fGrrv3i8O/fOPBV9Z/o9PXr/in9YJblzzo1HB0ND3MgFexSX1BdLemi/87ejV7OMri3705FVD//rYFxf+84+vvvifvn/14n/6/peW/Os9X1py3y3XLn/46muWPLLiukufPv/GZRuPv/7Szf/z2iXb3n3t4u17bdh/a6BdeUDZyr5Re+BdfYV9PxDbuR/vCw44r2QPWJHX+u5IRsv/HKQDtWQ0xPjmFLYeIcyq2Lx2HDovwiUOBgFlrVEU2ddbkCkzzkLJLNOYBrTBWuWcZ4WMbzvyFsNJhLythDqGIRznSlEfMp7Vax0ilyMfw3aVYjxDZnOU+spoJjUa4hSj9e2oDkZwhTEM7A3oyhhscdv/VJXhy1rB2nufcj9NP7t4/x+cvPTI805d+t6jpw3zq1C616CqX+6vQT+/9F2IIp+0ZO77Tlo8a9FJy2b+JJ/71OiYffz/hJWxhY1s46/M23cGipUCtJFVF8IpWUyOZ6tcJCYFVBtOE8oxT0GMMOgR1UabULlBwZRQDIpo1OpIkwbPJSOkaR3irYVcTOxdKgAAEABJREFUkPXamDfCpUKMMr0u72llQE4PLuNrsOJHOMVjhcb2GtqjCQYLM5HXgmdGN+V/6erllbNLbzkjbM/+g0K+/zvL4YH77Jf9Cj3T4VnXLXz21+9YvfGz1y96etnVFz5x7VcXPnf3DUMb7v3KBc8/ec2Fz6//ytD2Mfycr2PuhhkagiaCVwB9zDEwP09W7vko8hu/MDx684Xb116/eP19V5/5s+/ftPCZb33p3J9eee1Fj15y+9DGY29btP7Xrzv/+ep+2TvCARy8b9jc/12ldL8/nm3efJodLV3VGlV/Pz7Sfq5ZSyGbn8uBFuek2aiBrxV8C2nR+HJOWiMo8uw/S0cRhiniOEfWrkFbcGMc83PvEoVy2AedRaiEs2DbIVrNJsLAciNWqI0Po1SmCFQTAzMCNFqbUShm1JFRJK2UetHnj1DK1QCz58coD9TfZ6O1lzfdw/eu0w+ln1048IMzlu9/3oKlb38npq83lAT0G4qbNxgzn1l4xPyTFh906rGLZvztM+6f0zze9oNosL007k8Py8JxhH0KYREolgKM1Ueh6O22MxpdejMRzwJpguGcg5wnWuSMc5XSSwKcH6nkVUpVGGfQqtUQ8+sRjyxRLRZQH92OvlIRg9USbNLGjOogCrqC2vYMW9Y2eFYawTaqiLD3cJDP+j/JaHEVksGTYzvzt0vl+Qf0jz4f3nDJugNvX/ncH15/6U8XXvWFH371miX//tdfXPiP919/yQPrhoa+RzPu2djtYwGPXE66+G1zT1t+2L4Llr7ziHNWvuvoM1e8+6PnrHjPx85d+RtnnrvqNy86e8VvrTxr1W9edfaqo287a8V7/+TsVe/5f2ev/pV/PnvN4Q+cufotj13wpbdvWbBm/raTlw/UFlw+OD74eFTfWi41iGRjVEk3hv1d9DEkhDYJw5XZ6XBlTvvA9+/fOn3VnMZpK2ePLVgzb9Nxi2Y+fdbqdzxy5sp3/fjMFe/6h7NW/urfnb3yvd89a+XRt5698ugrGa44c/l7v3Dmst9YcO5lH/jjUxe96+gFK3/16BMvfvuRJy15+37HXfCWqmywuxVAN1Pk9ZWhB9d+ZfG/33f1wh/f/cVF911307KnPn/bsk3/5bYlW/dXY5WBZjM6oDEa/EEpmndabOZeObJF/X2kZ2PbxjYNbpVzaqHoRYeI0Rpv0Y82kLPq+XvtDWMBl6Y+nTMcGx2mhx2jWhpASgNtMwWlFI1uA3FkMF7bhmo5hrIOmvrWX6mi3W6jWi0jz9sYHdsMZxoolFso9bdRnpGgPDN5X0utvbyln/vxiZfOdGdf9rY/pdw+etKFR+3XHeZ08DpJYNoQTxK8LMqTlhzyvtNXHXjF8ZcO2r6BdWtR2nJtoT/7L9XZ/eibuTc/poVoJAGi0mya1CKSVNMr6QO0RhCGMGFAek46F5XSNLkheyhAcfEphNBcTJqvqQptyFd9x1fRgLmlouFCGkbMDzeN+hjABTayfRtGhrdg+9ZtaIylraQe/ZXJ5q8YLL79o6jv9S5X22vg6vOfmHHd4vW/f92STRdfd8mGG7+8cN3/++p5Tz87NISMHb/oljGesnCf+edf9rZ3nXXFm99/5uqDP3risgMuPOeqQ5ed88W33Hzi8rl/f8qquc+cfdV+7sRlg66pHx1NwmfX15Mnn0uD5+8faT9+b2ae/3ZTPf3NsexnX2roR1a2gp9c1FIPndNUPz22ZR77YEs//YGWeu49bbXh8MwMv3mkuX4WonRGdUa5rGNTKfVVY2eCOCgUVVwuIa4Uu5A4ITRBpUCZ9yPXFinyYKQ+GgQlUwxLUdUFmNM3q3hAYp5/axI8+c528NRvtMzjv90yj36obR79XMs8fm5bP3FxSz+xKo2e+/JI6+FvJdHae5v26XtR3npfy617VpU3jq1XP07PWD7LnbXigNo5q9788FnLD/lfZy0/+CtnLtt/6Vmr9j/jrFX7HXPOZfsefe7Kgw457oJZUxruG9c8NfqNFRuevXPlxr/+yucfve7aC58+767lo//li2c9o/qqvzngmgcdldbn/rFr7X31+Nbge9V4Pto1DcejjQ3PPY+kOYZI5zSi4xjo04jDGg3wdm7QObStAmmMyFS4KWuMbBtFyo+O4oE3qCq10Qz1Wg3KtZG2m/TCU5TLFQQ8rnLUN8UNPs0c4riKMB5E34wZKA6G2FJ78o9aat23W9Fzzx6/dP4Tn1203+LTVhx55IuUZprwC5eA/oX38AbvQAzTgmVHfOizF+1967PZA2mC536gi9s+3zfLKkuvt8BFYU0OpjBar0HHIaJyGc0sQRBFgHZotVowVPYaFwMtqI/LWV8YFqFVAKUMNALCQCkF8YSty4DcwiWgp5Qga4ZojimMb8/p+c7KVNZ3V2BnnG/SGb+116wDBr964YbiDYue/e83Dj10yZcu+qd7bln9wH038uwVO130bvpPveRX3nLuyvf+wWnL3nXy2at+ZfmClUd864wVb7vvhMXzt65XP0ttXF+7ZfypH7XSDd/Pgm3fdmbL6lry9CW11rPH62j0t4r9yf4uGENYSelNOfTNijAwpwRVaHfCuI2QX/dLg0BYasCUGwjK7UlIEJQymGLOUMoYNHjMktBQNNMWdwiHgEcsTZ5tZ8r5dMYtK1M5XgDSto+NwhQou5iyCztopE3InCRo+faDcsZQkMKUEqJNNKGLTRQHLGQeS4OOcSDuA2jGMXNehWmFeIBzyzG44ni5aba+3Ra2/2ESbjwjK2xe1NYbvlLPN9zdtNvv3dZ89tE0GBvbVny8debqN687ZejQe89c8Ws3nb3q3UtPWPqOk05c9M7fPHHoVw9ZwDeInaYEN37hb0dvHPrRj28d+undNy557NxbLt3wW+Xt88L6SHSAtZUPRLpvEbLKn4SqH/WRHJvXj0KhQONMnuMidG5gUERj2FJH4ruMm/+b0ejgwKP1Nj9c/mrY3DRzflYf/EhW6/vL8WFHg1xC2nTgd0SyYjycilFrpCj39WOkPg5n2pixV5nysOiboxBWm2+K+2uXjqdP3HfmVQfVjl900FePvejwo1l5+n4NJKBfgz7ecF0sGDq474RLDvzIKUsP+HM5O9vWeuS7M+aZzw3uXcbgnJloZQqtNADogTSaFgODs5EkCUzgaBoSogUd5ai1tiKMMn5IGWfI4oFCaAJEQQxabrSbiQ9dznpZDpvmyBMJLSyzaPWRZwFfSwe/m9ZnfD5MDni/qc8euPqc58PrLtr06Rsu2XzF9Ys2fu+L5zwz0hPi0BCCk5bM3e/k5fu+//QV+3301JX7Lztx2fxvnnbZvk+dumaeaxUeH1GD6362ofbjv7TxhutbZt3Cul37x3k8fGR1jplZnKFQnV2AoUEqDMQwoSYC8l9AuTKAat8MbB9uIQirgCohz2O+PcewrgjFo5EkM7Bgmt69VQUeuMTcWAimHemOoeWHJ+tYjmg0277tuEBDTtmEcQHtNINTQBCFcAAk7pSFj0+khW5ZxgBaIXeZj2c2hQ40okIE7mOwtgCb01O0JcZL5KVIkGZjthegnVhoE3IMjmOKIfxYdthqp8h1CMSsUywijSxQNmioFI5n8Cj2c/oHEfYPAKUYg/vMwcA+A2hHNYP+sXn16PGjW/FjJ7SDdYsQbLlBFTd+LyiufXRz84HRM67Y1x23bNa/HnfprBsXrD7o0uMXzz/mlKUHv3MBjfQx3XPuoaHvZd+4csOz1138zPdvGNqy/LqFGz981bnPK5vtt4/JDnh/fducS2x98O/krShpj9JA12Fb1fffuWzzp2+55Pl7b1wzPPq9IWTSzreueX79rUvXfveWoU1/mA3PeFfeLK9HHiHUnLuEc8vJVqpIOcRI8wRhrGiUa7D0wFtZC47ytc5B5DxzziCa+Ug5qI6dFvavv/fTiwbc6avedPuJi9/6e0NDHwg4PdP3L0AC+hfQ5i+0yT1tXJTolMWHfpiL4jttPTxqStvvMZWR/1GgRzRrXh9aeQ31ZBwpF3oQxjBBBPD9N4rL2L59BHFcRByE0PRVFE1R1m6hUi7SCKQwRiFL2ogjjSY/rrS5yKOwhEiXYZMItl3kx5QCPZwSsmZpW9IqXZu1Cx9Ns/jgOe3nzXWLH//ITct+dtV1yx78gbziyhg/QKU/aclR+51x6Xt//8yVR19w5qpfueWkSw96dLi0f2qD+rNKjX4/N8PfVoXRSxKz+WMojB6oijX0z9HIgzHMmBdD/lKZDRuQX7m1YYqWq6ONJoYbw6gO9qHWbHC8OeI45hgMWknmMTg4iLFanbQAKjDeiMlC1cbQuJE7Axga8DTLABVOguQHcEp7WKd5bFNBvdGGMgFqdYY6QERZNlsZxCDSJrIsjbBCN5R4D2A/AZrtBjQ3OWjn43FRaDUE3pCHcPzoCXqQUBF5CQjdgTasR/60Yv8aSdZGsVzycZDm2Hm9xb5Ank0AMfaFahHWOLTTlBssvJHKnEWz1YKM1wQB22licBYNW6ENHacwRKGSwxQamDU3ZDiOQqX57rjcOLGtNiwOK42782D0xw39/OjeRx2anrbqyB+fsfzdX6VHveC0Ze/+byct2XFGe+eKx9bdvOyxH9y2/PEVt65Y+zv7q1GDLDoKSfk3b1/12A/wEtedVz1x3/Dz5u31EfdIu645siJadCY0DOfTIOXub63FwIxBxnOEhRhJngGhQRgHqPMDYlwyUHEbUTnBzL0V9WbdZ1Vx8//ZFD6VnnjJIXeePvTu92P6+rlKQP9cW3sDNnbq0kOOPnnp/K9tCH6aUpm+E1WSDwdlzVfqGCqM6NEFNEYKSkcwNL7WOSjlYC2VkwbXUUmjIOS5GxdsrhG4EIreclGMbEvRNsQIdAwRZMrFWogCKOtQG22iOQ60xsrr69v6rszr+3wkb87Z78aFz826ZeG602+5ZMs9dyza/OTQEKx4uCcsmnv06ZcdePqJl+7zjVNWHvTI4aX11D6x56rG/Lul44O6tK390+9zHH77uhkduXbL3/w128K5ts4b/qAAAAABJRU5ErkJggg==";
    
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
            if (supplySource[item.k] && supplySource[item.k].includes('Customer')) drawTick(page1, c1X, cy - 2);
            
            drawBox(page1, c2X, cy - 2, CB_W, CB_H);
            drawText(page1, 'Halagel', c2X + 12, cy, S_TINY);
            // @ts-ignore
            if (supplySource[item.k] && supplySource[item.k].includes('Halagel')) drawTick(page1, c2X, cy - 2);
            
            cy -= 10;
        });

        // Others
        drawText(page1, 'OTHERS :', innerX, cy, S_SMALL);
        drawBox(page1, c1X, cy - 2, CB_W, CB_H);
        drawText(page1, 'Customer', c1X + 12, cy, S_TINY);
        if (supplySource.others && supplySource.others.includes('Customer')) drawTick(page1, c1X, cy - 2);
        
        drawBox(page1, c2X, cy - 2, CB_W, CB_H);
        drawText(page1, 'Halagel', c2X + 12, cy, S_TINY);
        if (supplySource.others && supplySource.others.includes('Halagel')) drawTick(page1, c2X, cy - 2);

        // REMARKS WITH BOX
        cy -= 15;
        drawText(page1, 'REMARKS:', innerX, cy, S_BOLD, true);
        cy -= 5;
        
        // Reduced remarks box height to prevent footer overlap
        const remarksBoxH = 60; 
        const remarksBoxW = contentW;
        const boxBottomY = cy - remarksBoxH;
        
        drawBox(page1, innerX, boxBottomY, remarksBoxW, remarksBoxH);
        
        // Wrap and Draw Remarks text inside box
        if (p.remarks) {
            const wrappedLines = wrapText(p.remarks, remarksBoxW - 6, S_SMALL, font); 
            let textY = cy - 10;
            const lineHeight = S_SMALL + 2;
            
            wrappedLines.forEach(line => {
                // Prevent drawing outside the box vertically (clipping)
                if (textY > boxBottomY + 2) { 
                     drawText(page1, line, innerX + 3, textY, S_SMALL);
                     textY -= lineHeight;
                }
            });
        }

        // Return slightly higher than box bottom to create gap foundation
        return boxBottomY - 5; 
    };

    // Draw Columns
    const endY1 = drawContentColumn(MARGIN, order);
    const endY2 = drawContentColumn(PAGE_WIDTH / 2, order.product2); 

    // --- SIGNATURES (Page 1) ---
    const sigBoxHeight = 65; // Compact height
    const lowestContentY = Math.min(endY1, endY2);
    
    // Ensure we don't overlap, but try to stick signature block nicely
    // Gap = 5 (from return) + 5 (here) = 10 pts
    let sY = lowestContentY - sigBoxHeight - 5;
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

    const drawSigCell = async (x: number, title: string, name: string | undefined, date: string | undefined, signatureBase64: string | undefined) => {
        // Title centered in top box
        drawText(page1, title, x + (sigW / 2), sY + sigBoxHeight - 11, S_BOLD, true, 'center');
        
        // Draw Signature Image if available
        if (signatureBase64) {
            try {
                const sigBytes = base64ToUint8Array(signatureBase64);
                if (sigBytes.length > 0) {
                    const sigImage = await pdfDoc.embedPng(sigBytes);
                    // Fit signature within the space (Height approx 25-30 pts, Width max sigW - 20)
                    const maxWidth = sigW - 20;
                    const maxHeight = 25;
                    const dims = sigImage.scaleToFit(maxWidth, maxHeight);
                    
                    page1.drawImage(sigImage, {
                        x: x + (sigW - dims.width) / 2,
                        y: nameLineY + 3, // Just above the name line
                        width: dims.width,
                        height: dims.height,
                    });
                }
            } catch (err) { console.error("Signature embed error", err); }
        }

        drawText(page1, 'Name :', x + 3, nameLineY - 8, S_TINY);
        drawText(page1, name || '', x + 30, nameLineY - 8, S_SMALL);
        drawText(page1, 'Date :', x + 3, dateLineY - 8, S_TINY);
        drawText(page1, formatDate(date), x + 30, dateLineY - 8, S_SMALL);
    };

    await drawSigCell(MARGIN, 'Prepared by ( Sales Executive )', order.salesPreparedBy, order.salesDate, order.salesPreparedSignature);
    // Approved by Sales Manager - Empty input as per request
    await drawSigCell(MARGIN + sigW, 'Approved by ( Sales Manager )', '', '', undefined);

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
    // Reduced row count from 25 to 20 to ensure footer fits
    const numRows = 20; 
    
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
    
    // Draw Planner Remarks (Section B)
    if (order.plannerRemarks) {
        // Use wrapText for Planner remarks too
        const wrappedPlannerRemarks = wrapText(order.plannerRemarks, CONTENT_WIDTH - 6, S_TEXT, font);
        let pTextY = py - remarksGap - 10;
        
        wrappedPlannerRemarks.forEach(line => {
            if (pTextY > remarksBoxBottom + 2) {
                drawText(page2, line, MARGIN + 5, pTextY, S_TEXT);
                pTextY -= (S_TEXT + 2);
            }
        });
    }
    
    // REDUCED GAP TO 3 (as requested ~1.2)
    py = remarksBoxBottom - 3; 

    // Page 2 Signatures - 4 Columns: Prepared, Reviewed, Approved, Received
    const sigH2 = 90; // Reduced height slightly
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

    const drawSigCell2 = async (idx: number, titleLines: string[], name: string | undefined, date: string | undefined, signatureBase64: string | undefined) => {
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
        
        // Draw Signature for Planner Prepared By (idx 0) if available
        // Could technically add signature slots for others, but prompt only asked for "Prepared By"
        if (signatureBase64 && idx === 0) {
             try {
                const sigBytes = base64ToUint8Array(signatureBase64);
                if (sigBytes.length > 0) {
                    const sigImage = await pdfDoc.embedPng(sigBytes);
                    // Space is roughly from py-30 (header) down to nY2 (name line)
                    // nY2 is py - 90 + 35 = py - 55. 
                    // Header ends at py-30.
                    // So we have space from py-30 down to py-55. Height = 25.
                    const maxWidth = sW2 - 10;
                    const maxHeight = 25;
                    const dims = sigImage.scaleToFit(maxWidth, maxHeight);
                    
                    page2.drawImage(sigImage, {
                        x: x + (sW2 - dims.width) / 2,
                        y: nY2 + 5, // Just above name line
                        width: dims.width,
                        height: dims.height,
                    });
                }
            } catch (err) { console.error("Signature embed error P2", err); }
        }

        drawText(page2, 'Name :', x + 3, nY2 - 8, S_TINY);
        drawText(page2, name || '', x + 30, nY2 - 8, S_SMALL);
        drawText(page2, 'Date :', x + 3, dY2 - 8, S_TINY);
        drawText(page2, formatDate(date), x + 30, dY2 - 8, S_SMALL);
    };

    await drawSigCell2(0, ['Prepared by', '( Production Planner )'], order.plannerPreparedBy, order.plannerPreparedDate, order.plannerPreparedSignature);
    await drawSigCell2(1, ['Reviewed by', '( Production Manager )'], order.plannerReviewedBy, order.plannerReviewedDate, undefined);
    await drawSigCell2(2, ['Approved by', '( Plant Manager )'], order.plannerApprovedBy, order.plannerApprovedDate, undefined);
    await drawSigCell2(3, ['Received by', '( Production HOD )'], order.plannerReceivedBy, order.plannerReceivedDate, undefined);

    // Reduced gap here too
    py -= sigH2 + 8; 
    
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
