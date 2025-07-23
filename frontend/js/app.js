const app = document.getElementById('app');
const views = {
    inventory: '<h2>Inventory</h2><p>Manage products and stock.</p>',
    purchases: '<h2>Purchases</h2><p>Record new purchases.</p>',
    suppliers: '<h2>Suppliers</h2><p>Manage supplier information.</p>',
    sales: '<h2>Sales</h2><p>Enter sales records.</p>',
    members: '<h2>Members</h2><p>Manage member data.</p>',
};

document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.target.dataset.view;
        loadView(view);
    });
});

function loadView(view) {
    app.innerHTML = views[view] || '<p>Select a view.</p>';
}

// Load default view
loadView('inventory');
