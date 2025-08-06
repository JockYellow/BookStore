// static/js/sales_history.js

document.addEventListener('DOMContentLoaded', function() {
    const historyList = document.getElementById('sales-history-list');

    const renderSales = (sales) => {
        if (!historyList) return;
        if (!sales || sales.length === 0) {
            historyList.innerHTML = `<tr><td colspan="4" class="text-center py-4">沒有任何銷售記錄</td></tr>`;
            return;
        }
        historyList.innerHTML = sales.map(sale => {
            const amount = sale.total || sale.final_amount || 0;
            const date = sale.created_at || sale.sale_date;
            return `
                <tr>
                    <td class="px-6 py-4 whitespace-nowrap">${sale.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${sale.member_id || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">$${amount.toLocaleString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${date ? new Date(date).toLocaleString() : ''}</td>
                </tr>
            `;
        }).join('');
    };

    const loadSales = async () => {
        try {
            const res = await fetch('/api/sales');
            if (!res.ok) throw new Error('load failed');
            const data = await res.json();
            renderSales(data);
        } catch (err) {
            console.error(err);
            historyList.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-red-500">載入失敗</td></tr>`;
        }
    };

    loadSales();
});
