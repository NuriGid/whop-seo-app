import React from 'react';
import { WhopPlan } from '../types';

interface PlansTableProps {
    plans: WhopPlan[];
}

const PlansTable: React.FC<PlansTableProps> = ({ plans }) => {
    if (plans.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl">
                <p className="text-gray-400">No plans found.</p>
            </div>
        );
    }

    return (
        <div className="overflow-hidden bg-gray-800/40 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-xl">
            <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm whitespace-nowrap">
                    <thead className="uppercase tracking-wider border-b border-gray-700 bg-gray-900/50 text-gray-400">
                        <tr>
                            <th scope="col" className="px-6 py-4 font-semibold">Title</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Price</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Period (Days)</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Visibility</th>
                            <th scope="col" className="px-6 py-4 font-semibold">Notes</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/50">
                        {plans.map((plan) => (
                            <tr key={plan.id} className="hover:bg-gray-700/20 transition-colors">
                                <td className="px-6 py-4 font-medium text-white">
                                    {plan.title || 'Untitled Plan'}
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    {plan.initial_price} {plan.currency?.toUpperCase()}
                                </td>
                                <td className="px-6 py-4 text-gray-300">
                                    {plan.billing_period || 'N/A'}
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${plan.visibility === 'visible'
                                            ? 'bg-green-900/30 text-green-300 border-green-800'
                                            : 'bg-gray-700/30 text-gray-400 border-gray-600'
                                        }`}>
                                        {plan.visibility}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-400 italic">
                                    {plan.internal_notes || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PlansTable;
