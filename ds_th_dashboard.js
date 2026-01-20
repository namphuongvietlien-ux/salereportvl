// DS_TH Dashboard Integration - Version 5.1
// Real drilldown with SKU data from monthly CSV files
// Uses shortened product names from ten_sp_nhan.csv

let dsThChart = null;
let dsThBrandChart = null;

// DS_TH targets template (fill later)
window.dsThTargets = window.dsThTargets || {};
window.dsThTargetsTemplate = window.dsThTargetsTemplate || {
    "2026-01": {
        total: 0,
        brands: { FUJITSU: 0, COLEMAN: 0, AZARINE: 0, BAKING_SODA: 0 }
    }
};

function loadDsThTargets() {
    try {
        const raw = localStorage.getItem('dsThTargets');
        if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                window.dsThTargets = parsed;
            }
        }
    } catch (_) {
        // ignore
    }
}

function saveDsThTargets() {
    try {
        localStorage.setItem('dsThTargets', JSON.stringify(window.dsThTargets || {}));
    } catch (_) {
        // ignore
    }
}

// Lookup table for short product names - use existing global if available
var dsThProductNameLookup = window.productNameLookup || {};

function buildCsvUrl(path) {
    try {
        return new URL(path, window.location.href).toString();
    } catch (_) {
        return encodeURI(path);
    }
}

// Load product name lookup table
function loadProductNameLookup(callback) {
    Papa.parse(buildCsvUrl('ten_sp_nhan.csv'), {
        download: true,
        header: true,
        worker: true,
        skipEmptyLines: true,
        complete: function (results) {
            results.data.forEach(row => {
                const fullName = (row['TEN SP'] || '').trim();
                const shortName = (row['TEN RUT GON'] || '').trim();
                if (fullName && shortName) {
                    dsThProductNameLookup[fullName] = shortName;
                }
            });
            if (callback) callback();
        },
        error: function (err) {
            if (callback) callback();
        }
    });
}

// Get short name for product, fallback to truncated full name
function getShortProductName(fullName, maxLen = 20) {
    const lookup = dsThProductNameLookup[fullName];
    if (lookup) return lookup;
    // Try partial match
    for (const key in dsThProductNameLookup) {
        if (fullName.includes(key) || key.includes(fullName.substring(0, 30))) {
            return dsThProductNameLookup[key];
        }
    }
    return fullName.substring(0, maxLen);
}

function getDsThBrandKey(brand, year) {
    if (!brand) return null;
    const b = brand.toUpperCase().trim();
    if (b === 'FUJITSU') return 'FUJITSU';
    if (b === 'COLEMAN') return 'COLEMAN';
    if (b === 'BAKING SODA' || b === 'BAKING_SODA') return 'BAKING_SODA';
    if (year < 2025 && b === 'ADIDAS') return 'AZARINE';
    if (year >= 2025 && b === 'AZARINE') return 'AZARINE';
    return null;
}

function getDsThTargetTotal(yearMonth) {
    const targets = window.dsThTargets || {};
    const entry = targets[yearMonth];
    return entry && entry.total ? entry.total : 0;
}

function applyDsThTargetsToData(data) {
    if (!Array.isArray(data)) return;
    data.forEach(row => {
        const ym = row['NAM_THANG'];
        const total = getDsThTargetTotal(ym);
        if (total > 0) {
            row.TARGET = total;
        }
    });
}

function ensureDsThTargetFormDefaults(data) {
    const monthInput = document.getElementById('ds_th_target_month');
    if (!monthInput || !Array.isArray(data) || data.length === 0) return;
    if (!monthInput.value) {
        const latest = data[data.length - 1];
        if (latest && latest.NAM_THANG) {
            monthInput.value = latest.NAM_THANG;
        }
    }
}

window.setDsThTotalTarget = function () {
    const month = (document.getElementById('ds_th_target_month') || {}).value;
    const value = parseFloat((document.getElementById('ds_th_target_total') || {}).value) || 0;
    if (!month || value <= 0) return;

    window.dsThTargets = window.dsThTargets || {};
    window.dsThTargets[month] = window.dsThTargets[month] || { total: 0, brands: {} };
    window.dsThTargets[month].total = value;
    saveDsThTargets();

    if (Array.isArray(window.dsThData)) {
        applyDsThTargetsToData(window.dsThData);
        const selectedYear = (document.getElementById('ds_th_year_select') || {}).value || 'all';
        renderDSTHKPIs(window.dsThData, selectedYear);
        renderDSTHTable(window.dsThData, selectedYear);
        renderDSTHChart(window.dsThData, selectedYear);
        renderBrandChart(window.dsThData, selectedYear);
    }
};

window.setDsThBrandTarget = function () {
    const month = (document.getElementById('ds_th_target_month') || {}).value;
    const brand = (document.getElementById('ds_th_target_brand') || {}).value;
    const value = parseFloat((document.getElementById('ds_th_target_brand_value') || {}).value) || 0;
    if (!month || !brand || value <= 0) return;

    window.dsThTargets = window.dsThTargets || {};
    window.dsThTargets[month] = window.dsThTargets[month] || { total: 0, brands: {} };
    window.dsThTargets[month].brands = window.dsThTargets[month].brands || {};
    window.dsThTargets[month].brands[brand] = value;
    saveDsThTargets();
};

function buildDSTHDataFromAllData(allData) {
    const monthlyMap = new Map();

    allData.forEach(row => {
        const year = parseInt(row.year);
        const monthKey = row.monthKey;
        if (!year || !monthKey) return;
        const brandKey = getDsThBrandKey(row['NHÃN HÀNG'], year);
        if (!brandKey) return;

        const monthNum = parseInt(monthKey.split('-')[1], 10);
        const vat = parseFloat(row.vat) || 0;

        let entry = monthlyMap.get(monthKey);
        if (!entry) {
            entry = {
                NAM: String(year),
                THANG: String(monthNum),
                NAM_THANG: monthKey,
                TARGET: getDsThTargetTotal(monthKey),
                FUJITSU: 0,
                COLEMAN: 0,
                AZARINE: 0,
                BAKING_SODA: 0,
                SALE_IN: 0,
                PERCENT: 0
            };
            monthlyMap.set(monthKey, entry);
        }

        entry[brandKey] += vat;
    });

    const result = Array.from(monthlyMap.values()).sort((a, b) => a.NAM_THANG.localeCompare(b.NAM_THANG));
    result.forEach(row => {
        row.SALE_IN = (row.FUJITSU || 0) + (row.COLEMAN || 0) + (row.AZARINE || 0) + (row.BAKING_SODA || 0);
        row.PERCENT = row.TARGET > 0 ? ((row.SALE_IN / row.TARGET) * 100).toFixed(1) : 0;
    });

    return result;
}

// ===== DATA LOADING =====
function loadDSTHData(callback) {
    console.log('🔵 [DS_TH] Loading DS_TH_clean.csv...');
    Papa.parse(buildCsvUrl('DS_TH_clean.csv'), {
        download: true,
        header: true,
        worker: true,
        skipEmptyLines: true,
        complete: function (results) {
            console.log('🔵 [DS_TH] CSV parsed. Total rows:', results.data.length);
            console.log('🔵 [DS_TH] First row:', results.data[0]);
            let data = results.data.filter(row => row['NAM'] && row['THANG'] && parseFloat(row['SALE_IN']) > 0);
            console.log('🔵 [DS_TH] After filter (NAM, THANG, SALE_IN>0):', data.length, 'rows');
            if (data.length > 0) {
                console.log('🔵 [DS_TH] Sample filtered row:', data[0]);
            }
            callback(data);
        },
        error: function (err) {
            console.error('❌ [DS_TH] Error loading CSV:', err);
            callback([]);
        }
    });
}

// ===== UTILITY FUNCTIONS =====
function formatNumber(num) {
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(0) + 'K';
    return num.toLocaleString('vi-VN');
}

function formatFullNumber(num) {
    return num.toLocaleString('vi-VN');
}

function getYoYChange(data, currentRow, brand) {
    const currentYear = parseInt(currentRow['NAM']);
    const currentMonth = parseInt(currentRow['THANG']);
    const prevRow = data.find(row => parseInt(row['NAM']) === currentYear - 1 && parseInt(row['THANG']) === currentMonth);
    if (!prevRow) return null;
    const currentValue = parseFloat(currentRow[brand]) || 0;
    const prevValue = parseFloat(prevRow[brand]) || 0;
    if (prevValue === 0) return null;
    return ((currentValue - prevValue) / prevValue * 100);
}

function formatYoY(change) {
    if (change === null) return '';
    const sign = change >= 0 ? '↑' : '↓';
    const color = change >= 0 ? '#10b981' : '#ef4444';
    return `<span style="font-size:0.7em;color:${color};">${sign}${Math.abs(change).toFixed(0)}%</span>`;
}

function getAzarineDisplayLabel(selectedYear) {
    if (selectedYear && selectedYear !== 'all') {
        const yearNum = parseInt(selectedYear);
        if (!isNaN(yearNum) && yearNum < 2025) {
            return 'ADIDAS';
        }
        return 'AZARINE';
    }
    return 'AZARINE/ADIDAS';
}

// ===== KPI RENDERING =====
function renderDSTHKPIs(data, selectedYear) {
    let filteredData = selectedYear === 'all' ? data : data.filter(row => row['NAM'] === selectedYear);
    let totalTarget = 0, totalSale = 0;
    filteredData.forEach(row => {
        totalTarget += parseFloat(row['TARGET']) || 0;
        totalSale += parseFloat(row['SALE_IN']) || 0;
    });
    const percent = totalTarget > 0 ? Math.round((totalSale / totalTarget) * 100) : 0;

    document.getElementById('ds_th_kpi_target').textContent = formatNumber(totalTarget) + ' ₫';
    document.getElementById('ds_th_kpi_sale').textContent = formatNumber(totalSale) + ' ₫';
    document.getElementById('ds_th_kpi_percent').textContent = percent + '%';
    document.getElementById('ds_th_kpi_percent').style.color = percent >= 35 ? '#10b981' : (percent >= 25 ? '#f59e0b' : '#ef4444');

    if (selectedYear !== 'all') {
        const prevData = data.filter(row => row['NAM'] === (parseInt(selectedYear) - 1).toString());
        if (prevData.length > 0) {
            const prevTotalSale = prevData.reduce((sum, row) => sum + (parseFloat(row['SALE_IN']) || 0), 0);
            const yoyChange = prevTotalSale > 0 ? ((totalSale - prevTotalSale) / prevTotalSale * 100).toFixed(1) : 0;
            const yoyEl = document.getElementById('ds_th_kpi_yoy');
            if (yoyEl) {
                yoyEl.textContent = `YoY: ${yoyChange >= 0 ? '+' : ''}${yoyChange}%`;
                yoyEl.style.color = yoyChange >= 0 ? '#10b981' : '#ef4444';
            }
        }
    }
}

// ===== TABLE RENDERING WITH CLICKABLE CELLS =====
function renderDSTHTable(data, selectedYear) {
    const tbody = document.getElementById('ds_th_table_body');
    if (!tbody) return;

    const azarineLabel = getAzarineDisplayLabel(selectedYear);

    let filteredData = selectedYear === 'all' ? data : data.filter(row => row['NAM'] === selectedYear);
    filteredData.sort((a, b) => {
        if (a['NAM'] !== b['NAM']) return parseInt(a['NAM']) - parseInt(b['NAM']);
        return parseInt(a['THANG']) - parseInt(b['THANG']);
    });

    tbody.innerHTML = '';
    const thead = tbody.parentElement.querySelector('thead tr');
    if (thead) {
        thead.innerHTML = `
            <th style="padding:6px;border:1px solid #ddd;background:#f3f4f6;position:sticky;left:0;z-index:2;font-size:0.85em;">Tháng</th>
            <th style="padding:6px;border:1px solid #ddd;background:#e0f2fe;cursor:pointer;font-size:0.85em;" onclick="showBrandGrowth('FUJITSU')">FUJITSU 📈</th>
            <th style="padding:6px;border:1px solid #ddd;background:#fef3c7;cursor:pointer;font-size:0.85em;" onclick="showBrandGrowth('COLEMAN')">COLEMAN 📈</th>
            <th style="padding:6px;border:1px solid #ddd;background:#fce7f3;cursor:pointer;font-size:0.85em;" onclick="showBrandGrowth('AZARINE')">${azarineLabel} 📈</th>
            <th style="padding:6px;border:1px solid #ddd;background:#d1fae5;cursor:pointer;font-size:0.85em;" onclick="showBrandGrowth('BAKING_SODA')">BAKING 📈</th>
            <th style="padding:6px;border:1px solid #ddd;background:#f3f4f6;font-size:0.85em;">Tổng DS</th>
            <th style="padding:6px;border:1px solid #ddd;background:#f3f4f6;font-size:0.85em;">DS/Target%</th>
        `;
    }

    const brands = ['FUJITSU', 'COLEMAN', 'AZARINE', 'BAKING_SODA'];
    const brandColors = { FUJITSU: '#e0f2fe', COLEMAN: '#fef3c7', AZARINE: '#fce7f3', BAKING_SODA: '#d1fae5' };

    const azarineFilter = selectedYear !== 'all' && parseInt(selectedYear) < 2025 ? 'ADIDAS' : 'AZARINE';

    filteredData.forEach(row => {
        const tr = document.createElement('tr');
        const targetValue = parseFloat(row['TARGET']) || 0;
        const saleValue = parseFloat(row['SALE_IN']) || 0;
        const percent = targetValue > 0 ? Math.round((saleValue / targetValue) * 100) : 0;
        const percentColor = percent >= 35 ? '#10b981' : (percent >= 25 ? '#f59e0b' : '#ef4444');

        let html = `<td style="padding:6px;border:1px solid #ddd;font-weight:600;position:sticky;left:0;background:#fff;z-index:1;font-size:0.85em;">${row['NAM_THANG']}</td>`;

        brands.forEach(brand => {
            const value = parseFloat(row[brand]) || 0;
            const yoy = getYoYChange(data, row, brand);
            const bgColor = brandColors[brand];
            const brandNameForFilter = brand === 'BAKING_SODA'
                ? 'BAKING SODA'
                : (brand === 'AZARINE' ? azarineFilter : brand);
            html += `<td style="padding:6px;border:1px solid #ddd;text-align:right;background:${bgColor};cursor:pointer;font-size:0.85em;" 
                        onclick="openSKUDrilldown('${row['NAM_THANG']}', '${brandNameForFilter}')" 
                        title="🔍 Click xem chi tiết SKU">
                ${formatNumber(value)} ${formatYoY(yoy)}
            </td>`;
        });

        const saleYoY = getYoYChange(data, row, 'SALE_IN');
        html += `<td style="padding:6px;border:1px solid #ddd;text-align:right;font-weight:600;color:#3b82f6;cursor:pointer;font-size:0.85em;" 
                    onclick="openSKUDrilldown('${row['NAM_THANG']}', 'ALL')"
                    title="🔍 Click xem tất cả SKU">
            ${formatNumber(parseFloat(row['SALE_IN']) || 0)} ${formatYoY(saleYoY)}
        </td>`;
        html += `<td style="padding:6px;border:1px solid #ddd;text-align:center;font-weight:600;color:${percentColor};font-size:0.85em;">${percent}%</td>`;

        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

// ===== SKU DRILLDOWN - Load real data from monthly CSV =====
function openSKUDrilldown(yearMonth, brand) {
    // Parse year and month
    const [year, month] = yearMonth.split('-');

    // Create modal if not exists
    let modal = document.getElementById('ds_th_sku_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ds_th_sku_modal';
        modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;justify-content:center;align-items:flex-start;padding-top:30px;overflow-y:auto;';
        modal.innerHTML = `
            <div style="background:white;border-radius:12px;padding:25px;max-width:95%;width:1200px;max-height:90vh;overflow:auto;margin:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;position:sticky;top:0;background:white;padding-bottom:10px;border-bottom:2px solid #e5e7eb;">
                    <h3 id="sku_modal_title" style="margin:0;font-size:1.3em;">📊 Chi tiết SKU</h3>
                    <button onclick="closeSKUModal()" style="border:none;background:#ef4444;color:white;padding:8px 20px;border-radius:6px;cursor:pointer;font-size:1em;">✕ Đóng</button>
                </div>
                <div id="sku_modal_summary" style="display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin-bottom:20px;"></div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
                    <div style="background:#f9fafb;border-radius:8px;padding:15px;">
                        <h4 style="margin:0 0 10px 0;">🏪 Top Hệ Thống</h4>
                        <div id="sku_system_chart_container" style="height:250px;"><canvas id="sku_system_chart"></canvas></div>
                    </div>
                    <div style="background:#f9fafb;border-radius:8px;padding:15px;">
                        <h4 style="margin:0 0 10px 0;">📦 Top SKU</h4>
                        <div id="sku_product_chart_container" style="height:250px;"><canvas id="sku_product_chart"></canvas></div>
                    </div>
                </div>
                <div style="background:#f9fafb;border-radius:8px;padding:15px;">
                    <h4 style="margin:0 0 10px 0;">📋 Chi tiết giao dịch</h4>
                    <div id="sku_detail_table" style="max-height:300px;overflow:auto;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Update title
    const brandName = brand === 'ALL' ? 'Tất cả nhãn' : brand;
    document.getElementById('sku_modal_title').innerHTML = `📊 Chi tiết SKU: <span style="color:#3b82f6;">${brandName}</span> - Tháng <span style="color:#10b981;">${yearMonth}</span>`;
    document.getElementById('sku_modal_summary').innerHTML = '<div style="text-align:center;padding:20px;grid-column:span 4;">⏳ Đang tải dữ liệu...</div>';
    document.getElementById('sku_detail_table').innerHTML = '<div style="text-align:center;padding:20px;">⏳ Đang tải...</div>';

    modal.style.display = 'flex';

    // Find matching CSV file
    findAndLoadCSV(year, month, brand);
}

function findAndLoadCSV(year, month, brand) {
    // Try to find CSV file matching the year-month pattern
    const paddedMonth = month.padStart(2, '0');
    const possiblePatterns = [
        `CSV_Output_Latest_Only/${year}-${paddedMonth}`,
    ];

    // Fetch directory listing or try known patterns
    tryLoadCSVFile(year, month, brand, 0);
}

function tryLoadCSVFile(year, month, brand, attemptIndex) {
    const paddedMonth = month.padStart(2, '0');

    // Common date formats in the folder (Try full year YYYY first, then short year YY)
    const shortYear = year.slice(2);
    const possibleFiles = [
        // Full year suffix (e.g. 31.01.2024) - Most recent standard
        `${year}-${paddedMonth}-31_DS_31.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-30_DS_30.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-29_DS_29.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-28_DS_28.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-27_DS_27.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-24_DS_24.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-22_DS_22.${paddedMonth}.${year}.csv`,
        `${year}-${paddedMonth}-15_DS_15.${paddedMonth}.${year}.csv`,
        // Short year suffix (e.g. 30.09.22) - Older files
        `${year}-${paddedMonth}-31_DS_31.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-30_DS_30.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-29_DS_29.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-28_DS_28.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-27_DS_27.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-24_DS_24.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-22_DS_22.${paddedMonth}.${shortYear}.csv`,
        `${year}-${paddedMonth}-15_DS_15.${paddedMonth}.${shortYear}.csv`
    ];

    if (attemptIndex >= possibleFiles.length) {
        showNoDataMessage(year, month, brand);
        return;
    }

    const csvPath = `CSV_Output_Latest_Only/${possibleFiles[attemptIndex]}`;

    Papa.parse(csvPath, {
        download: true,
        header: true,
        skipEmptyLines: true,
        complete: function (results) {
            if (results.data && results.data.length > 0) {
                processSKUData(results.data, brand, year, month);
            } else {
                tryLoadCSVFile(year, month, brand, attemptIndex + 1);
            }
        },
        error: function (err) {
            tryLoadCSVFile(year, month, brand, attemptIndex + 1);
        }
    });
}

function showNoDataMessage(year, month, brand) {
    document.getElementById('sku_modal_summary').innerHTML = `
        <div style="grid-column:span 4;text-align:center;padding:20px;background:#fef3c7;border-radius:8px;">
            <p style="margin:0;color:#f59e0b;">⚠️ Không tìm thấy file dữ liệu cho tháng ${year}-${month}</p>
            <p style="margin:10px 0 0;font-size:0.9em;color:#666;">Có thể file CSV chưa được tạo hoặc có tên khác.</p>
        </div>
    `;
    document.getElementById('sku_detail_table').innerHTML = '';
}

function processSKUData(rawData, brand, year, month) {
    // Filter by brand if not ALL
    let data = rawData;
    if (brand !== 'ALL') {
        data = rawData.filter(row => {
            const rowBrand = (row['NHÃN HÀNG'] || '').toUpperCase().trim();
            return rowBrand.includes(brand.toUpperCase());
        });
    }

    if (data.length === 0) {
        document.getElementById('sku_modal_summary').innerHTML = `
            <div style="grid-column:span 4;text-align:center;padding:20px;background:#fef3c7;border-radius:8px;">
                <p style="margin:0;color:#f59e0b;">⚠️ Không có dữ liệu cho nhãn ${brand} trong tháng này</p>
            </div>
        `;
        document.getElementById('sku_detail_table').innerHTML = '';
        return;
    }

    // Calculate summaries
    let totalRevenue = 0;
    let totalQty = 0;
    const systemSales = {};
    const productSales = {};

    data.forEach(row => {
        const revenue = parseFloat(row['THÀNH TIỀN']) || 0;
        const qty = parseInt(row['SL']) || 0;
        const system = row['HỆ THỐNG'] || 'Khác';
        const product = row['TÊN SP'] || 'N/A';

        totalRevenue += revenue;
        totalQty += qty;

        systemSales[system] = (systemSales[system] || 0) + revenue;
        productSales[product] = (productSales[product] || 0) + revenue;
    });

    // Top 10 systems
    const topSystems = Object.entries(systemSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Top 10 products
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    // Render summary
    document.getElementById('sku_modal_summary').innerHTML = `
        <div style="background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:white;padding:15px;border-radius:8px;text-align:center;">
            <div style="font-size:0.8em;opacity:0.9;">💰 Tổng Doanh Số</div>
            <div style="font-size:1.5em;font-weight:bold;">${formatFullNumber(totalRevenue)} ₫</div>
        </div>
        <div style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:15px;border-radius:8px;text-align:center;">
            <div style="font-size:0.8em;opacity:0.9;">📦 Tổng SL</div>
            <div style="font-size:1.5em;font-weight:bold;">${formatFullNumber(totalQty)}</div>
        </div>
        <div style="background:linear-gradient(135deg,#f59e0b,#d97706);color:white;padding:15px;border-radius:8px;text-align:center;">
            <div style="font-size:0.8em;opacity:0.9;">🏪 Số Hệ Thống</div>
            <div style="font-size:1.5em;font-weight:bold;">${Object.keys(systemSales).length}</div>
        </div>
        <div style="background:linear-gradient(135deg,#8b5cf6,#7c3aed);color:white;padding:15px;border-radius:8px;text-align:center;">
            <div style="font-size:0.8em;opacity:0.9;">📋 Số Giao Dịch</div>
            <div style="font-size:1.5em;font-weight:bold;">${data.length}</div>
        </div>
    `;

    // Render charts
    renderSKUCharts(topSystems, topProducts);

    // Render detail table
    renderSKUDetailTable(data, year, month);
}

let skuSystemChart = null;
let skuProductChart = null;

function renderSKUCharts(topSystems, topProducts) {
    // System chart
    const systemCtx = document.getElementById('sku_system_chart');
    if (skuSystemChart) skuSystemChart.destroy();

    skuSystemChart = new Chart(systemCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topSystems.map(s => s[0].substring(0, 20)),
            datasets: [{
                label: 'Doanh số',
                data: topSystems.map(s => s[1]),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { callback: v => formatNumber(v) },
                    grid: { display: false }
                },
                y: {
                    ticks: { font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });

    // Product chart
    const productCtx = document.getElementById('sku_product_chart');
    if (skuProductChart) skuProductChart.destroy();

    skuProductChart = new Chart(productCtx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: topProducts.map(p => getShortProductName(p[0], 18)),
            datasets: [{
                label: 'Doanh số',
                data: topProducts.map(p => p[1]),
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderWidth: 0
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    ticks: { callback: v => formatNumber(v) },
                    grid: { display: false }
                },
                y: {
                    ticks: { font: { size: 10 } },
                    grid: { display: false }
                }
            }
        }
    });
}

function renderSKUDetailTable(data, year, month) {
    const aggregated = new Map();

    data.forEach(row => {
        const system = row['HỆ THỐNG'] || 'Khác';
        const product = row['TÊN SP'] || 'N/A';
        const qty = parseInt(row['SL']) || 0;
        const key = `${system}||${product}`;
        aggregated.set(key, {
            system,
            product,
            qty: (aggregated.get(key)?.qty || 0) + qty
        });
    });

    const prevMonthKey = getPrevMonthKey(year, month);
    const prevMonthMap = buildSkuSystemQtyMap(prevMonthKey);

    const rows = Array.from(aggregated.values())
        .map(item => {
            const prevQty = prevMonthMap.get(`${item.system}||${item.product}`) || 0;
            const changePct = prevQty > 0 ? ((item.qty - prevQty) / prevQty * 100) : null;
            return { ...item, prevQty, changePct };
        })
        .sort((a, b) => b.qty - a.qty);

    let html = `
        <table style="width:100%;border-collapse:collapse;font-size:0.85em;">
            <thead>
                <tr style="background:#f3f4f6;position:sticky;top:0;">
                    <th style="padding:8px;border:1px solid #ddd;text-align:left;">SKU</th>
                    <th style="padding:8px;border:1px solid #ddd;text-align:left;">Hệ Thống</th>
                    <th style="padding:8px;border:1px solid #ddd;text-align:right;">Số Lượng</th>
                    <th style="padding:8px;border:1px solid #ddd;text-align:right;">% Tăng/Giảm</th>
                </tr>
            </thead>
            <tbody>
    `;

    const displayRows = rows.slice(0, 50);
    displayRows.forEach(row => {
        const change = row.changePct;
        const isUp = change !== null && change >= 0;
        const changeColor = change === null ? '#64748b' : (isUp ? '#10b981' : '#ef4444');
        const changeText = change === null ? '-' : `${isUp ? '↑' : '↓'}${Math.abs(change).toFixed(1)}%`;
        html += `
            <tr>
                <td style="padding:6px;border:1px solid #ddd;">${getShortProductName(row.product, 40)}</td>
                <td style="padding:6px;border:1px solid #ddd;">${row.system}</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;">${formatFullNumber(row.qty)}</td>
                <td style="padding:6px;border:1px solid #ddd;text-align:right;color:${changeColor};font-weight:600;">${changeText}</td>
            </tr>
        `;
    });

    html += `</tbody></table>`;
    if (rows.length > 50) {
        html += `<p style="text-align:center;color:#666;margin-top:10px;">Hiển thị 50/${rows.length} SKU (sắp xếp theo số lượng giảm dần)</p>`;
    }

    document.getElementById('sku_detail_table').innerHTML = html;
}

function getPrevMonthKey(year, month) {
    const yearNum = parseInt(year, 10);
    const monthNum = parseInt(month, 10);
    if (!yearNum || !monthNum) return null;
    let prevYear = yearNum;
    let prevMonth = monthNum - 1;
    if (prevMonth === 0) {
        prevMonth = 12;
        prevYear -= 1;
    }
    return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

function buildSkuSystemQtyMap(monthKey) {
    const map = new Map();
    if (!monthKey || !Array.isArray(window.allData)) return map;
    window.allData.forEach(row => {
        if (row.monthKey !== monthKey) return;
        const system = row['HỆ THỐNG'] || 'Khác';
        const product = row['TÊN SP'] || 'N/A';
        const qty = parseInt(row['SL']) || 0;
        const key = `${system}||${product}`;
        map.set(key, (map.get(key) || 0) + qty);
    });
    return map;
}

function closeSKUModal() {
    const modal = document.getElementById('ds_th_sku_modal');
    if (modal) modal.style.display = 'none';
}

// ===== BRAND GROWTH POPUP =====
function showBrandGrowth(brand) {
    const data = window.dsThData;
    if (!data) return;

    const selectedYear = (document.getElementById('ds_th_year_select') || {}).value || 'all';
    const azarineLabel = getAzarineDisplayLabel(selectedYear);

    const brandKey = brand;
    const brandData = data.map(row => ({
        yearMonth: row['NAM_THANG'],
        value: parseFloat(row[brandKey]) || 0
    })).sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

    let html = `<table style="width:100%;border-collapse:collapse;margin-top:10px;">`;
    html += `<tr style="background:#f3f4f6;"><th style="padding:8px;border:1px solid #ddd;">Tháng</th><th style="padding:8px;border:1px solid #ddd;">Doanh số</th><th style="padding:8px;border:1px solid #ddd;">Thay đổi MoM</th></tr>`;

    brandData.forEach((item, idx) => {
        const prevValue = idx > 0 ? brandData[idx - 1].value : 0;
        const change = prevValue > 0 ? ((item.value - prevValue) / prevValue * 100) : 0;
        const changeColor = change >= 0 ? '#10b981' : '#ef4444';
        const changeSign = change >= 0 ? '+' : '';

        html += `<tr>
            <td style="padding:8px;border:1px solid #ddd;">${item.yearMonth}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;">${formatNumber(item.value)}</td>
            <td style="padding:8px;border:1px solid #ddd;text-align:right;color:${changeColor};">${changeSign}${change.toFixed(1)}%</td>
        </tr>`;
    });
    html += `</table>`;

    // Create simple modal for growth
    let modal = document.getElementById('ds_th_growth_modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ds_th_growth_modal';
        modal.style.cssText = 'display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:10000;justify-content:center;align-items:center;';
        modal.innerHTML = `
            <div style="background:white;border-radius:12px;padding:25px;max-width:600px;width:90%;max-height:80vh;overflow:auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px;">
                    <h3 id="growth_modal_title" style="margin:0;">📈 Xu Hướng</h3>
                    <button onclick="document.getElementById('ds_th_growth_modal').style.display='none'" style="border:none;background:#ef4444;color:white;padding:8px 16px;border-radius:6px;cursor:pointer;">✕ Đóng</button>
                </div>
                <div id="growth_modal_content"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    const displayBrand = brand === 'AZARINE' ? azarineLabel : brand.replace('_', ' ');
    document.getElementById('growth_modal_title').textContent = `📈 Xu Hướng ${displayBrand}`;
    document.getElementById('growth_modal_content').innerHTML = html;
    modal.style.display = 'flex';
}

// ===== CHARTS =====
function renderDSTHChart(data, selectedYear) {
    const ctx = document.getElementById('ds_th_chart');
    if (!ctx) return;

    let filteredData = selectedYear === 'all' ? data : data.filter(row => row['NAM'] === selectedYear);
    filteredData.sort((a, b) => {
        if (a['NAM'] !== b['NAM']) return parseInt(a['NAM']) - parseInt(b['NAM']);
        return parseInt(a['THANG']) - parseInt(b['THANG']);
    });

    const labels = filteredData.map(row => row['NAM_THANG']);
    const sales = filteredData.map(row => parseFloat(row['SALE_IN']) || 0);
    const targets = filteredData.map(row => parseFloat(row['TARGET']) || 0);

    if (dsThChart) dsThChart.destroy();

    dsThChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Doanh số', data: sales, backgroundColor: 'rgba(59, 130, 246, 0.8)', borderWidth: 1 },
                { label: 'Target', data: targets, backgroundColor: 'rgba(245, 158, 11, 0.2)', borderColor: '#f59e0b', borderWidth: 2, type: 'line', fill: false }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '📊 Doanh số vs Target' }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } },
                x: { ticks: { maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

function renderBrandChart(data, selectedYear) {
    const ctx = document.getElementById('ds_th_brand_chart');
    if (!ctx) return;

    const azarineLabel = getAzarineDisplayLabel(selectedYear);

    let filteredData = selectedYear === 'all' ? data : data.filter(row => row['NAM'] === selectedYear);
    filteredData.sort((a, b) => {
        if (a['NAM'] !== b['NAM']) return parseInt(a['NAM']) - parseInt(b['NAM']);
        return parseInt(a['THANG']) - parseInt(b['THANG']);
    });

    const labels = filteredData.map(row => row['NAM_THANG']);
    const brands = [
        { key: 'FUJITSU', label: 'FUJITSU', color: '#3b82f6' },
        { key: 'COLEMAN', label: 'COLEMAN', color: '#f59e0b' },
        { key: 'AZARINE', label: azarineLabel, color: '#ec4899' },
        { key: 'BAKING_SODA', label: 'BAKING SODA', color: '#10b981' }
    ];

    const datasets = brands.map(brand => ({
        label: brand.label,
        data: filteredData.map(row => parseFloat(row[brand.key]) || 0),
        backgroundColor: brand.color + '99',
        borderColor: brand.color,
        borderWidth: 1
    }));

    if (dsThBrandChart) dsThBrandChart.destroy();

    dsThBrandChart = new Chart(ctx.getContext('2d'), {
        type: 'bar',
        data: { labels, datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: '🏷️ Doanh số theo Nhãn Hàng' }
            },
            scales: {
                x: { stacked: true, ticks: { maxRotation: 45, minRotation: 45 } },
                y: { stacked: true, ticks: { callback: v => formatNumber(v) } }
            }
        }
    });
}

// ===== YEAR FILTER =====
function createYearFilter(data) {
    const years = [...new Set(data.map(row => row['NAM']))].sort();
    const filterContainer = document.getElementById('ds_th_year_filter');
    if (!filterContainer) return;

    let html = '<label style="font-weight:600;margin-right:10px;">Năm:</label>';
    html += '<select id="ds_th_year_select" style="padding:8px 15px;border:1px solid #ddd;border-radius:6px;font-size:14px;">';
    html += '<option value="all">Tất cả</option>';
    years.forEach(year => html += `<option value="${year}">${year}</option>`);
    html += '</select>';

    filterContainer.innerHTML = html;

    document.getElementById('ds_th_year_select').addEventListener('change', function () {
        const selectedYear = this.value;
        renderDSTHKPIs(window.dsThData, selectedYear);
        renderDSTHTable(window.dsThData, selectedYear);
        renderDSTHChart(window.dsThData, selectedYear);
        renderBrandChart(window.dsThData, selectedYear);
    });
}

// ===== INITIALIZATION =====
function initDSTHDashboard() {
    if (window.dsThInitDone) {
        return;
    }
    window.dsThInitAttempts = (window.dsThInitAttempts || 0) + 1;
    console.log('🟢 [DS_TH] initDSTHDashboard() called');
    console.log('🟢 [DS_TH] Papa defined?', typeof Papa !== 'undefined');
    console.log('🟢 [DS_TH] Chart defined?', typeof Chart !== 'undefined');

    // Check if Papa and Chart are loaded
    if (typeof Papa === 'undefined' || typeof Chart === 'undefined') {
        console.warn('⚠️ [DS_TH] Papa or Chart not loaded, retrying in 500ms...');
        if (window.dsThInitAttempts < 12) {

            setTimeout(initDSTHDashboard, 500);
        }
        return;
    }

    // Check if elements exist
    const elements = {
        'ds_th_kpi_target': document.getElementById('ds_th_kpi_target'),
        'ds_th_kpi_sale': document.getElementById('ds_th_kpi_sale'),
        'ds_th_kpi_percent': document.getElementById('ds_th_kpi_percent'),
        'ds_th_table_body': document.getElementById('ds_th_table_body'),
        'ds_th_chart': document.getElementById('ds_th_chart'),
        'ds_th_brand_chart': document.getElementById('ds_th_brand_chart')
    };

    console.log('🟢 [DS_TH] Elements check:', {
        target: !!elements.ds_th_kpi_target,
        sale: !!elements.ds_th_kpi_sale,
        percent: !!elements.ds_th_kpi_percent,
        table: !!elements.ds_th_table_body,
        chart: !!elements.ds_th_chart,
        brandChart: !!elements.ds_th_brand_chart
    });

    // Check for required elements
    for (const key in elements) {
        if (!elements[key]) {
            console.error('❌ [DS_TH] Missing element:', key);
            if (window.dsThInitAttempts < 12) {
                console.warn('⚠️ [DS_TH] Elements not ready, retrying in 500ms...');
                setTimeout(initDSTHDashboard, 500);
            } else if (elements.ds_th_kpi_target) {
                elements.ds_th_kpi_target.textContent = 'Không thể tải DS_TH';
                if (elements.ds_th_kpi_sale) elements.ds_th_kpi_sale.textContent = '--';
                if (elements.ds_th_kpi_percent) elements.ds_th_kpi_percent.textContent = '--';
            }
            return;
        }
    }

    console.log('✅ [DS_TH] All elements found, loading data...');

    // Load lookup table first, then load main data
    loadProductNameLookup(function () {
        console.log('🟢 [DS_TH] Product lookup loaded');

        // Prefer real data aggregated from CSV_Output_Latest_Only (allData)
        if (Array.isArray(window.allData) && window.allData.length > 0) {
            const data = buildDSTHDataFromAllData(window.allData);
            console.log('🟢 [DS_TH] Built from allData, length:', data.length);
            if (!data || data.length === 0) {
                console.error('❌ [DS_TH] No data built from allData');
            } else {
                loadDsThTargets();
                applyDsThTargetsToData(data);
                window.dsThData = data;
                createYearFilter(data);
                ensureDsThTargetFormDefaults(data);

                const latestYear = Math.max(...data.map(row => parseInt(row['NAM']))).toString();
                console.log('✅ [DS_TH] Latest year:', latestYear);

                renderDSTHKPIs(data, latestYear);
                renderDSTHTable(data, latestYear);
                renderDSTHChart(data, latestYear);
                renderBrandChart(data, latestYear);

                const select = document.getElementById('ds_th_year_select');
                if (select) select.value = latestYear;

                console.log('✅ [DS_TH] Initialization complete!');
                window.dsThInitDone = true;
                return;
            }
        }

        // Fallback to DS_TH_clean.csv
        loadDSTHData(function (data) {
            console.log('🟢 [DS_TH] Data callback received, length:', data ? data.length : 0);
            if (!data || data.length === 0) {
                console.error('❌ [DS_TH] No data loaded from DS_TH_clean.csv');
                document.getElementById('ds_th_kpi_target').textContent = 'Không có dữ liệu';
                document.getElementById('ds_th_kpi_sale').textContent = '--';
                document.getElementById('ds_th_kpi_percent').textContent = '--';
                return;
            }

            console.log('✅ [DS_TH] Data loaded successfully:', data.length, 'rows');
            loadDsThTargets();
            applyDsThTargetsToData(data);
            window.dsThData = data;
            createYearFilter(data);
            ensureDsThTargetFormDefaults(data);

            const latestYear = Math.max(...data.map(row => parseInt(row['NAM']))).toString();
            console.log('✅ [DS_TH] Latest year:', latestYear);

            renderDSTHKPIs(data, latestYear);
            renderDSTHTable(data, latestYear);
            renderDSTHChart(data, latestYear);
            renderBrandChart(data, latestYear);

            const select = document.getElementById('ds_th_year_select');
            if (select) select.value = latestYear;

            console.log('✅ [DS_TH] Initialization complete!');
            window.dsThInitDone = true;
        });
    });
}

// Export to global scope for manual initialization
window.initDSTHDashboard = initDSTHDashboard;
console.log('📢 [DS_TH] Script loaded, initDSTHDashboard exported to window');

// Helper to re-init if data is still missing
window.ensureDSTHInitialized = function () {
    const hasData = Array.isArray(window.dsThData) && window.dsThData.length > 0;
    const kpiTarget = document.getElementById('ds_th_kpi_target');
    const kpiText = kpiTarget ? kpiTarget.textContent.trim() : '';
    if (!hasData || kpiText === '' || kpiText.includes('Đang tải')) {
        initDSTHDashboard();
    }
};

// Safety auto-init in case showDashboard() isn't called or runs too early
if (document.readyState === 'complete') {
    setTimeout(initDSTHDashboard, 500);
} else {
    window.addEventListener('load', () => setTimeout(initDSTHDashboard, 500));
}
