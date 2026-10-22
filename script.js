const $ = id => document.getElementById(id);

const STORAGE_KEY = "smartbank_college_demo_v1";

let accounts = [];
let transactions = [];
let nextAccountNumber = 10001;

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        accounts,
        transactions,
        nextAccountNumber
    }));
}

function loadData() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");

        accounts = Array.isArray(data.accounts) ? data.accounts : [];
        transactions = Array.isArray(data.transactions) ? data.transactions : [];

        nextAccountNumber = Number.isInteger(data.nextAccountNumber)
            ? data.nextAccountNumber
            : 10001;
    } catch {
        accounts = [];
        transactions = [];
        nextAccountNumber = 10001;
    }
}

function showMessage(id, text, success) {
    const el = $(id);
    el.textContent = text;
    el.className = "message " + (success ? "success" : "error");
}

function money(value) {
    return Number(value).toLocaleString("en-IN", {
        style: "currency",
        currency: "INR"
    });
}

function login(event) {
    event.preventDefault();

    const username = $("username").value.trim();
    const password = $("password").value;

    if (username === "admin" && password === "admin123") {
        sessionStorage.setItem("smartbank_logged_in", "yes");
        showApp();
    } else {
        showMessage("loginMessage", "Invalid username or password.", false);
    }
}

function showApp() {
    $("loginPage").hidden = true;
    $("app").hidden = false;
    render();
}

function logout() {
    sessionStorage.removeItem("smartbank_logged_in");
    $("app").hidden = true;
    $("loginPage").hidden = false;
    $("password").value = "";
}

function render() {
    const total = accounts.reduce((sum, account) => sum + account.balance, 0);

    $("totalBalance").textContent = money(total);
    $("accountCount").textContent =
        accounts.length + (accounts.length === 1 ? " account" : " accounts");

    const select = $("accountSelect");
    const selectedValue = select.value;

    select.replaceChildren(new Option("Select account", ""));

    accounts.forEach(account => {
        select.add(new Option(
            account.number + " — " + account.name,
            account.number
        ));
    });

    if (accounts.some(account => account.number === selectedValue)) {
        select.value = selectedValue;
    }

    const accountTable = $("accountsTable");
    accountTable.replaceChildren();

    if (accounts.length === 0) {
        const row = accountTable.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 3;
        cell.textContent = "No customer accounts created yet.";
    }

    accounts.forEach(account => {
        const row = accountTable.insertRow();
        row.insertCell().textContent = account.number;
        row.insertCell().textContent = account.name;
        row.insertCell().textContent = money(account.balance);
    });

    const history = $("historyTable");
    history.replaceChildren();

    if (transactions.length === 0) {
        const row = history.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.textContent = "No transactions yet.";
    }

    transactions.slice(0, 50).forEach(transaction => {
        const row = history.insertRow();
        row.insertCell().textContent = transaction.date;
        row.insertCell().textContent = transaction.account;
        row.insertCell().textContent = transaction.type;
        row.insertCell().textContent =
            (transaction.type === "Deposit" ? "+" : "-") +
            money(transaction.amount);
    });
}

$("loginForm").addEventListener("submit", login);

$("logoutBtn").addEventListener("click", logout);

$("accountForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = $("customerName").value.trim();
    const email = $("customerEmail").value.trim();

    if (!name || !email) {
        showMessage("accountMessage", "Please fill in all fields.", false);
        return;
    }

    const account = {
        number: "SB" + nextAccountNumber++,
        name,
        email,
        balance: 0
    };

    accounts.push(account);

    try {
        saveData();
    } catch {
        accounts.pop();
        nextAccountNumber--;
        showMessage("accountMessage", "Could not save account data.", false);
        return;
    }

    $("accountForm").reset();
    render();

    $("accountSelect").value = account.number;

    showMessage(
        "accountMessage",
        "Account created successfully: " + account.number,
        true
    );
});

$("transactionForm").addEventListener("submit", event => {
    event.preventDefault();

    const accountNumber = $("accountSelect").value;
    const type = $("transactionType").value;
    const amount = Number($("amount").value);

    const account = accounts.find(item => item.number === accountNumber);

    if (!account) {
        showMessage("transactionMessage", "Please select an account.", false);
        return;
    }

    if (!Number.isFinite(amount) || amount <= 0) {
        showMessage("transactionMessage", "Enter a valid amount.", false);
        return;
    }

    const cents = Math.round(amount * 100);

    if (!Number.isSafeInteger(cents) || cents <= 0) {
        showMessage("transactionMessage", "Amount is too large or invalid.", false);
        return;
    }

    if (type === "withdraw" && cents > Math.round(account.balance * 100)) {
        showMessage("transactionMessage", "Insufficient balance!", false);
        return;
    }

    const previousBalance = account.balance;
    const newBalanceCents = Math.round(previousBalance * 100) +
        (type === "deposit" ? cents : -cents);

    if (!Number.isSafeInteger(newBalanceCents) || newBalanceCents < 0) {
        showMessage("transactionMessage", "Invalid balance.", false);
        return;
    }

    account.balance = newBalanceCents / 100;

    const transaction = {
        account: account.number,
        type: type === "deposit" ? "Deposit" : "Withdrawal",
        amount: cents / 100,
        date: new Date().toLocaleString("en-IN")
    };

    transactions.unshift(transaction);

    try {
        saveData();
    } catch {
        account.balance = previousBalance;
        transactions.shift();
        showMessage("transactionMessage", "Could not save transaction.", false);
        return;
    }

    $("amount").value = "";
    render();

    showMessage(
        "transactionMessage",
        "Transaction successful! New balance: " + money(account.balance),
        true
    );
});

$("resetBtn").addEventListener("click", () => {
    const confirmed = confirm(
        "Delete all SmartBank demo accounts and transactions from this browser?"
    );

    if (!confirmed) return;

    const previousData = localStorage.getItem(STORAGE_KEY);

    accounts = [];
    transactions = [];
    nextAccountNumber = 10001;

    try {
        saveData();
        render();
        showMessage("transactionMessage", "Demo data reset successfully.", true);
        showMessage("accountMessage", "", true);
    } catch {
        if (previousData !== null) {
            localStorage.setItem(STORAGE_KEY, previousData);
        }
        loadData();
        render();
        showMessage("transactionMessage", "Could not reset demo data.", false);
    }
});

loadData();

if (sessionStorage.getItem("smartbank_logged_in") === "yes") {
    showApp();
}
