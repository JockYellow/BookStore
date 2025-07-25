document.addEventListener('DOMContentLoaded', () => {
    const topProductsBody = document.getElementById('topProductsBody');

    const loadReport = async () => {
        window.app.ui.showLoading('載入報表資料...');
        try {
            const res = await fetch('./data/reports.json');
            if (!res.ok) throw new Error('load failed');
            const data = await res.json();
            renderCharts(data);
            renderTopProducts(data.top_products);
        } catch (err) {
            console.error(err);
            window.app.ui.showNotification('error', '載入報表失敗');
        } finally {
            window.app.ui.hideLoading();
        }
    };

    const renderCharts = (data) => {
        const dailyLabels = Object.keys(data.daily_sales || {});
        const dailyValues = Object.values(data.daily_sales || {});
        const ctxDaily = document.getElementById('dailySalesChart').getContext('2d');
        new Chart(ctxDaily, {
            type: 'line',
            data: {
                labels: dailyLabels,
                datasets: [{
                    label: '銷售額',
                    data: dailyValues,
                    backgroundColor: 'rgba(59,130,246,0.1)',
                    borderColor: 'rgb(59,130,246)',
                    tension: 0.3,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        const categoryLabels = Object.keys(data.category_sales || {});
        const categoryValues = Object.values(data.category_sales || {});
        const ctxCategory = document.getElementById('categorySalesChart').getContext('2d');
        new Chart(ctxCategory, {
            type: 'doughnut',
            data: {
                labels: categoryLabels,
                datasets: [{
                    data: categoryValues,
                    backgroundColor: [
                        '#60a5fa','#34d399','#fbbf24','#f87171','#a78bfa','#f472b6'
                    ]
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    };

    const renderTopProducts = (products) => {
        if (!products || products.length === 0) {
            topProductsBody.innerHTML = '<tr><td colspan="2" class="text-center py-4">無資料</td></tr>';
            return;
        }
        topProductsBody.innerHTML = products.map(p => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${p.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">$${p.amount}</td>
            </tr>
        `).join('');
    };

    loadReport();
});
