import React, { useState } from 'react';
import { FaCreditCard, FaLock, FaCheck, FaTimes, FaCcVisa, FaCcMastercard, FaCcAmex } from 'react-icons/fa';
import toast from 'react-hot-toast';

const CardPayment = ({ amount, rideId, onSuccess, onCancel }) => {
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const formatExpiry = (value) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    const formatted = formatExpiry(e.target.value);
    setExpiryDate(formatted);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (cardNumber.replace(/\s/g, '').length < 16) {
      toast.error('Please enter a valid 16-digit card number');
      return;
    }
    if (!cardName) {
      toast.error('Please enter the cardholder name');
      return;
    }
    if (expiryDate.length < 5) {
      toast.error('Please enter a valid expiry date (MM/YY)');
      return;
    }
    if (cvv.length < 3) {
      toast.error('Please enter a valid CVV (3-4 digits)');
      return;
    }

    setIsProcessing(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsSuccess(true);
      toast.success('Payment successful!');
      
      setTimeout(() => {
        if (onSuccess) onSuccess({ 
          success: true, 
          transactionId: 'TXN-' + Date.now(),
          amount: amount 
        });
      }, 1500);
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0E1A2A] rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-[#1A2A4A]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Card Payment</h3>
          <button onClick={onCancel} className="text-gray-400 hover:text-white transition">
            <FaTimes />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-green-500/30">
              <FaCheck className="text-green-400 text-3xl" />
            </div>
            <h4 className="text-xl font-bold text-green-400">Payment Successful!</h4>
            <p className="text-gray-400 mt-2">Your payment of R{amount?.toFixed(2)} was processed successfully.</p>
            <button
              onClick={() => onSuccess && onSuccess({ success: true })}
              className="mt-4 w-full py-3 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition shadow-lg shadow-[#1A6BFF]/30"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Card Number
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="1234 5678 9012 3456"
                  maxLength="19"
                  className="w-full px-3 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition pl-10"
                />
                <FaCreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="John Doe"
                className="w-full px-3 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  value={expiryDate}
                  onChange={handleExpiryChange}
                  placeholder="MM/YY"
                  maxLength="5"
                  className="w-full px-3 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  CVV
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
                    placeholder="123"
                    maxLength="4"
                    className="w-full px-3 py-3 bg-[#080E1F] border border-[#1A2A4A] rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#1A6BFF] transition pr-10"
                  />
                  <FaLock className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs" />
                </div>
              </div>
            </div>

            <div className="mb-4 p-3 bg-[#080E1F] rounded-xl border border-[#1A2A4A]">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">Amount to pay:</span>
                <span className="text-xl font-bold text-green-400">R{amount?.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 bg-[#1A2A4A] text-gray-300 rounded-xl hover:bg-[#2A3A5A] transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isProcessing}
                className="flex-1 py-3 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition disabled:opacity-50 flex items-center justify-center shadow-lg shadow-[#1A6BFF]/30"
              >
                {isProcessing ? (
                  <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                ) : (
                  `Pay R${amount?.toFixed(2)}`
                )}
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              🔒 Your payment is secure. We do not store your card details.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default CardPayment;