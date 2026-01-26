import React, { useState } from 'react';
import { WhopPayment, WhopFee } from '../types';

interface PaymentsTableProps {
    payments: WhopPayment[];
    userToken: string | null;
    companyId: string | null;
}

const PaymentsTable: React.FC<PaymentsTableProps> = ({ payments, userToken, companyId }) => {
    const [expandedPaymentId, setExpandedPaymentId] = useState<string | null>(null);
    const [fees, setFees] = useState<Record<string, WhopFee[]>>({});
    const [loadingFees, setLoadingFees] = useState<Record<string, boolean>>({});

    const handleToggleFees = async (paymentId: string) => {
        if (expandedPaymentId === paymentId) {
            setExpandedPaymentId(null);
            return;
        }

        setExpandedPaymentId(paymentId);

        // If fees already loaded, don't fetch again
        if (fees[paymentId]) return;

        setLoadingFees(prev => ({ ...prev, [paymentId]: true }));

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userToken}`
            };
            if (companyId) {
                headers['X-Whop-Company-Id'] = companyId;
            }

            const response = await fetch(`/api/payments/${paymentId}/fees`, {
                method: 'GET',
                headers: headers
            });

            if (!response.ok) throw new Error('Failed to fetch fees');

            const data = await response.json();
            setFees(prev => ({ ...prev, [paymentId]: data.data || [] }));
        } catch (error) {
            console.error('Error fetching fees:', error);
        } finally {
            setLoadingFees(prev => ({ ...prev, [paymentId]: false }));
        }
    };

    if (payments.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl">
                <p className="text-gray-400">No payments found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-xl">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="uppercase tracking-wider border-b border-gray-700 bg-gray-900/50 text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold">User</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Amount</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Status</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Date</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {payments.map((payment) => (
                            <React.Fragment key={payment.id}>
                                <tr className="hover:bg-gray-700/20 transition-colors">
                                    <td className="px-6 py-4 font-medium text-white">
                                        <div className="flex flex-col">
                                            <span>{payment.user?.name || payment.user?.username || 'Unknown User'}</span>
                                            <span className="text-xs text-gray-500">{payment.user?.email}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">
                                        {payment.total} {payment.currency?.toUpperCase()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${payment.status === 'paid'
                                                ? 'bg-green-900/30 text-green-300 border-green-800'
                                                : payment.status === 'refunded'
                                                    ? 'bg-red-900/30 text-red-300 border-red-800'
                                                    : 'bg-gray-700/30 text-gray-400 border-gray-600'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-400">
                                        {new Date(payment.created_at || '').toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => handleToggleFees(payment.id)}
                                            className="text-purple-400 hover:text-purple-300 text-xs font-semibold uppercase tracking-wide"
                                        >
                                            {expandedPaymentId === payment.id ? 'Hide Fees' : 'View Fees'}
                                        </button>
                                    </td>
                                </tr>
                                {/* Fees Expansion Row */}
                                {expandedPaymentId === payment.id && (
                                    <tr className="bg-gray-900/30">
                                        <td colSpan={5} className="px-6 py-4">
                                            <div className="bg-black/20 rounded-xl p-4 border border-gray-700/30">
                                                <h4 className="text-sm font-semibold text-gray-300 mb-3">Transaction Fees</h4>

                                                {loadingFees[payment.id] ? (
                                                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                                                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                                        Loading fees...
                                                    </div>
                                                ) : fees[payment.id]?.length > 0 ? (
                                                    <ul className="space-y-2">
                                                        {fees[payment.id].map((fee, idx) => (
                                                            <li key={idx} className="flex justify-between text-sm text-gray-400 items-center">
                                                                <span>{fee.name} <span className="text-xs text-gray-600">({fee.type})</span></span>
                                                                <span className="font-mono text-gray-300">-{fee.amount} {fee.currency.toUpperCase()}</span>
                                                            </li>
                                                        ))}
                                                        <li className="flex justify-between text-sm font-semibold text-gray-200 pt-2 border-t border-gray-700/50 mt-2">
                                                            <span>Net Amount</span>
                                                            <span>
                                                                {(payment.total! - fees[payment.id].reduce((acc, curr) => acc + curr.amount, 0)).toFixed(2)} {payment.currency?.toUpperCase()}
                                                            </span>
                                                        </li>
                                                    </ul>
                                                ) : (
                                                    <p className="text-gray-500 text-sm">No fees recorded for this transaction.</p>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PaymentsTable;
