import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { ArrowDownLeft, ArrowUpRight, Search } from 'lucide-react';
import { useSession } from '../context/SessionContext';

export const Transactions = () => {
  const { profile } = useSession();
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!profile?.account_id) return;
      try {
        setIsLoading(true);
        const res = await fetch(`/api/transactions?account_id=${profile.account_id}&last_n=10`);
        const data = await res.json();
        if (data.status === 'success') {
          setTransactions(data.transactions);
          setBalance(data.balance);
        }
      } catch (err) {
        console.error("Failed to fetch transactions:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTransactions();
  }, [profile]);

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="h2 text-primary">Transactions</h2>
          <p className="body-sm text-secondary mt-1">Your recent account activity</p>
        </div>
        {balance !== null && (
          <div className="text-right">
            <span className="text-xs text-secondary font-bold uppercase tracking-wider">Avl Bal.</span>
            <p className="h3 text-primary font-bold mt-1">
              ₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}
      </div>

      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={20} className="text-secondary" />
        </div>
        <input 
          type="text" 
          placeholder="Search transactions..." 
          className="w-full bg-surface-container-low border border-surface-variant rounded-full py-3 pl-10 pr-4 focus:outline-none focus:border-primary body-sm"
        />
      </div>

      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-secondary">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-secondary">No recent transactions found.</div>
        ) : (
          <div className="divide-y divide-surface-variant">
            {transactions.map((txn, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${txn.type === 'credit' ? 'bg-primary-container text-on-primary-container' : 'bg-surface-variant text-secondary'}`}>
                    {txn.type === 'credit' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div>
                    <p className="font-semibold">{txn.description}</p>
                    <p className="text-xs text-secondary">{txn.date}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${txn.type === 'credit' ? 'text-primary' : 'text-on-surface'}`}>
                    {txn.type === 'credit' ? '+' : '-'}₹{txn.amount.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
