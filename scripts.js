        const amountInput = document.getElementById('amount');
        const transactionForm = document.getElementById('transaction-form');
        const descriptionInput = document.getElementById('description');
        const typeSelect = document.getElementById('type');
        const categorySelect = document.getElementById('category');
        const dateInput = document.getElementById('date');
        const transactionListEl = document.getElementById('transaction-list');
        const totalRevenueEl = document.getElementById('total-revenue');
        const totalExpenseEl = document.getElementById('total-expense');
        const netBalanceEl = document.getElementById('net-balance');
        const financeChartCanvas = document.getElementById('finance-chart').getContext('2d');
        const startDateInput = document.getElementById('start-date');
        const endDateInput = document.getElementById('end-date');
        const filterBtn = document.getElementById('filter-btn');
        const clearFilterBtn = document.getElementById('clear-filter-btn');
        const topRevenueSourcesEl = document.getElementById('top-revenue-sources');
        const topExpenseSourcesEl = document.getElementById('top-expense-sources');
        const closeMonthBtn = document.getElementById('close-month-btn');
        const archiveBtn = document.getElementById('archive-btn');
        const archiveModal = document.getElementById('archive-modal');
        const closeModalBtn = document.getElementById('close-modal-btn');
        const archiveListEl = document.getElementById('archive-list');
        const toastEl = document.getElementById('toast-notification');
        const toastMessageEl = document.getElementById('toast-message');

        let transactions = JSON.parse(localStorage.getItem('transactions_sm')) || [];
        let archives = JSON.parse(localStorage.getItem('archives_sm')) || [];
        let financeChart;

        const categories = {
            revenue: ['Salário', 'Freelance', 'Vendas', 'Investimentos', 'Outros'],
            expense: ['Moradia', 'Alimentação', 'Transporte', 'Lazer', 'Saúde', 'Educação', 'Compras', 'Outros']
        };

        // --- FUNCTIONS ---
        const formatCurrency = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const showToast = (message, isError = false) => {
            toastMessageEl.textContent = message;
            toastEl.className = `fixed top-8 right-8 p-4 rounded-lg shadow-lg text-white z-50 ${isError ? 'bg-red-500' : 'bg-green-500'} show`;
            setTimeout(() => {
                toastEl.classList.remove('show');
            }, 3000);
        };

        const formatCurrencyInput = () => {
            let value = amountInput.value.replace(/\D/g, '');
            if (value === '') {
                amountInput.value = '';
                return;
            }
            let numberValue = Number(value) / 100;
            amountInput.value = numberValue.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        const getRawCurrencyValue = (formattedValue) => {
            if (!formattedValue) return 0;
            return parseFloat(formattedValue.replace(/\./g, '').replace(',', '.')) || 0;
        };

        const updateCategoryOptions = () => {
            const selectedType = typeSelect.value;
            categorySelect.innerHTML = '';
            categories[selectedType].forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categorySelect.appendChild(option);
            });
        };
        
        const getFilteredTransactions = () => {
            const startDate = startDateInput.value;
            const endDate = endDateInput.value;
            if (!startDate || !endDate) return transactions;
            
            return transactions.filter(t => {
                const transactionDate = new Date(t.date);
                // Adjust to include the end date fully
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                return transactionDate >= new Date(startDate) && transactionDate <= endOfDay;
            });
        };

        const updateDashboard = (data) => {
            const revenues = data.filter(t => t.type === 'revenue').reduce((acc, t) => acc + t.amount, 0);
            const expenses = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            const balance = revenues - expenses;

            totalRevenueEl.textContent = formatCurrency(revenues);
            totalExpenseEl.textContent = formatCurrency(expenses);
            netBalanceEl.textContent = formatCurrency(balance);
            netBalanceEl.classList.toggle('text-red-600', balance < 0);
            netBalanceEl.classList.toggle('text-blue-700', balance >= 0);
        };
        
        const renderHistory = (data) => {
            transactionListEl.innerHTML = '';
            if (data.length === 0) {
                 transactionListEl.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhuma transação no período.</p>';
                 return;
            }

            const sorted = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
            sorted.forEach(t => {
                const item = document.createElement('div');
                item.className = `transaction-item ${t.type === 'revenue' ? 'transaction-revenue' : 'transaction-expense'} flex justify-between items-center`;
                item.innerHTML = `
                    <div>
                        <p class="font-semibold text-gray-800">${t.description}</p>
                        <p class="text-sm text-gray-500">${t.category} - ${new Date(t.date).toLocaleDateString('pt-BR', {timeZone: 'UTC'})}</p>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="font-bold text-lg ${t.type === 'revenue' ? 'text-green-600' : 'text-red-600'}">${t.type === 'revenue' ? '+' : '-'} ${formatCurrency(t.amount)}</span>
                        <button onclick="removeTransaction(${t.id})" class="text-gray-400 hover:text-gray-800 transition-colors"><i class="fa-solid fa-trash"></i></button>
                    </div>
                `;
                transactionListEl.appendChild(item);
            });
        };
        
        const updateInsights = (data) => {
            const getTopSources = (type) => Object.entries(data.filter(t => t.type === type).reduce((acc, t) => {
                if (!acc[t.category]) acc[t.category] = 0;
                acc[t.category] += t.amount;
                return acc;
            }, {})).sort((a, b) => b[1] - a[1]);

            const topRevenues = getTopSources('revenue');
            const topExpenses = getTopSources('expense');
            
            topRevenueSourcesEl.innerHTML = topRevenues.length > 0 ? topRevenues.map(r => `<li><div class="flex justify-between text-sm"><span class="text-gray-600">${r[0]}</span><strong class="text-green-600">${formatCurrency(r[1])}</strong></div></li>`).join('') : '<li class="text-sm text-gray-500">Nenhuma receita.</li>';
            topExpenseSourcesEl.innerHTML = topExpenses.length > 0 ? topExpenses.map(e => `<li><div class="flex justify-between text-sm"><span class="text-gray-600">${e[0]}</span><strong class="text-red-600">${formatCurrency(e[1])}</strong></div></li>`).join('') : '<li class="text-sm text-gray-500">Nenhuma despesa.</li>';
        };

        const updateChart = (data) => {
            const totalRevenue = data.filter(t => t.type === 'revenue').reduce((acc, t) => acc + t.amount, 0);
            const totalExpense = data.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);
            
            if (financeChart) financeChart.destroy();
            financeChart = new Chart(financeChartCanvas, {
                type: 'bar',
                data: { labels: ['Balanço Financeiro'], datasets: [
                    { label: 'Receitas', data: [totalRevenue], backgroundColor: 'rgba(34, 197, 94, 0.7)', borderWidth: 1 },
                    { label: 'Despesas', data: [totalExpense], backgroundColor: 'rgba(239, 68, 68, 0.7)', borderWidth: 1 }
                ]},
                options: { responsive: true, maintainAspectRatio: false, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { callback: (value) => formatCurrency(value) }}}, plugins: { legend: { position: 'top', labels: { color: '#4B5563' }}}}
            });
        };

        const addTransaction = (e) => {
            e.preventDefault();
            const amount = getRawCurrencyValue(amountInput.value);
            if (!descriptionInput.value.trim() || amount <= 0 || !dateInput.value.trim()) {
                showToast('Por favor, preencha todos os campos corretamente.', true);
                return;
            }

            transactions.push({ id: Date.now(), description: descriptionInput.value, amount, type: typeSelect.value, category: categorySelect.value, date: dateInput.value });
            
            saveToLocalStorage();
            updateUI();
            transactionForm.reset();
            setDefaultDate();
            updateCategoryOptions();
            showToast('Transação adicionada com sucesso!');
        };

        window.removeTransaction = (id) => {
            transactions = transactions.filter(t => t.id !== id);
            saveToLocalStorage();
            updateUI();
            showToast('Transação removida.', true);
        };

        const saveToLocalStorage = () => {
            localStorage.setItem('transactions_sm', JSON.stringify(transactions));
            localStorage.setItem('archives_sm', JSON.stringify(archives));
        };
        
        const updateUI = () => {
            const filteredData = getFilteredTransactions();
            updateDashboard(filteredData);
            renderHistory(filteredData);
            updateChart(filteredData);
            updateInsights(filteredData);
        };
        
        const handleCloseMonth = () => {
            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();
            const monthName = new Date(year, month).toLocaleString('pt-BR', { month: 'long' });
            const archiveId = `${year}-${String(month + 1).padStart(2, '0')}`;
            
            if (archives.some(a => a.id === archiveId)) {
                showToast(`O mês de ${monthName} de ${year} já foi fechado.`, true);
                return;
            }

            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            const monthTransactions = transactions.filter(t => new Date(t.date) >= firstDay && new Date(t.date) <= lastDay);

            const revenue = monthTransactions.filter(t => t.type === 'revenue').reduce((acc, t) => acc + t.amount, 0);
            const expense = monthTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

            archives.push({ id: archiveId, label: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)}/${year}`, revenue, expense, balance: revenue - expense });
            
            saveToLocalStorage();
            showToast(`Fechamento de ${monthName} de ${year} realizado!`);
        };
        
        const renderArchives = () => {
            archiveListEl.innerHTML = '';
            if (archives.length === 0) {
                 archiveListEl.innerHTML = '<p class="text-gray-500 text-center py-4">Nenhum fechamento arquivado.</p>';
                 return;
            }
            [...archives].sort((a,b) => b.id.localeCompare(a.id)).forEach(a => {
                const item = document.createElement('div');
                item.className = 'p-4 border rounded-lg mb-2 bg-gray-50';
                item.innerHTML = `
                    <h4 class="font-bold text-lg text-gray-800">${a.label}</h4>
                    <div class="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div><p class="text-sm text-gray-500">Receita</p><p class="font-semibold text-green-600">${formatCurrency(a.revenue)}</p></div>
                        <div><p class="text-sm text-gray-500">Despesa</p><p class="font-semibold text-red-600">${formatCurrency(a.expense)}</p></div>
                        <div><p class="text-sm text-gray-500">Saldo</p><p class="font-semibold ${a.balance >= 0 ? 'text-blue-700' : 'text-red-600'}">${formatCurrency(a.balance)}</p></div>
                    </div>`;
                archiveListEl.appendChild(item);
            });
        };

        const setDefaultDate = () => { dateInput.valueAsDate = new Date(); };
        const clearFilters = () => { startDateInput.value = ''; endDateInput.value = ''; updateUI(); }

        const init = () => {
            amountInput.addEventListener('input', formatCurrencyInput);
            typeSelect.addEventListener('change', updateCategoryOptions);
            transactionForm.addEventListener('submit', addTransaction);
            filterBtn.addEventListener('click', updateUI);
            clearFilterBtn.addEventListener('click', clearFilters);
            closeMonthBtn.addEventListener('click', handleCloseMonth);
            archiveBtn.addEventListener('click', () => {
                renderArchives();
                archiveModal.classList.remove('hidden');
                archiveModal.classList.add('flex');
            });
            closeModalBtn.addEventListener('click', () => {
                archiveModal.classList.add('hidden');
                archiveModal.classList.remove('flex');
            });
            
            setDefaultDate();
            updateCategoryOptions();
            updateUI();
        };

        init();
    