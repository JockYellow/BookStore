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
                <tr data-id="${sale.id}" class="cursor-pointer hover:bg-gray-100">
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

    const modal = document.getElementById('sale-detail-modal');
    const content = document.getElementById('sale-detail-content');
    const closeBtns = [document.getElementById('close-sale-detail'), document.getElementById('sale-detail-close-btn')];

    const closeModal = () => {
        modal.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    };

    closeBtns.forEach(btn => btn?.addEventListener('click', closeModal));

    historyList.addEventListener('click', async (e) => {
        const row = e.target.closest('tr[data-id]');
        if (!row) return;
        try {
            const res = await fetch(`/api/sales/${row.dataset.id}`);
            if (!res.ok) throw new Error('load failed');
            const sale = await res.json();
            const itemsHtml = (sale.items || []).map(it => `
                <tr>
                    <td class="px-2 py-1">${it.product_id}</td>
                    <td class="px-2 py-1 text-right">${it.quantity}</td>
                    <td class="px-2 py-1 text-right">$${it.unit_price}</td>
                    <td class="px-2 py-1 text-right">$${(it.quantity * it.unit_price).toLocaleString()}</td>
                </tr>
            `).join('');
            content.innerHTML = `
                <p class="mb-2">訂單編號：${sale.id}</p>
                <p class="mb-2">會員：${sale.member_id || '-'}</p>
                <table class="min-w-full text-sm mb-2">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-2 py-1 text-left">商品</th>
                            <th class="px-2 py-1 text-right">數量</th>
                            <th class="px-2 py-1 text-right">單價</th>
                            <th class="px-2 py-1 text-right">小計</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
                <p class="text-right">小計：$${(sale.subtotal || 0).toLocaleString()}</p>
                <p class="text-right">折扣：-$${(sale.discount || 0).toLocaleString()}</p>
                <p class="text-right font-bold">總計：$${(sale.total || 0).toLocaleString()}</p>
            `;
            modal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');
        } catch (err) {
            console.error(err);
        }
    });
});
