import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  FaArrowLeft, 
  FaCreditCard, 
  FaPlus, 
  FaTrash, 
  FaLock, 
  FaCheckCircle,
  FaCcVisa,
  FaCcMastercard,
  FaCcAmex
} from 'react-icons/fa';
import toast from 'react-hot-toast';
import CardPayment from '../components/CardPayment';

const PaymentMethods = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAddCard, setShowAddCard] = useState(false);
  const [cards, setCards] = useState([
    {
      id: 1,
      last4: '4242',
      brand: 'Visa',
      expiry: '12/25',
      isDefault: true
    },
    {
      id: 2,
      last4: '8888',
      brand: 'Mastercard',
      expiry: '06/26',
      isDefault: false
    }
  ]);

  const handleAddCard = (cardData) => {
    const newCard = {
      id: Date.now(),
      last4: cardData.last4 || '1234',
      brand: cardData.brand || 'Visa',
      expiry: cardData.expiry || '12/26',
      isDefault: cards.length === 0
    };
    setCards([...cards, newCard]);
    setShowAddCard(false);
    toast.success('Card added successfully!');
  };

  const handleRemoveCard = (cardId) => {
    if (cards.length === 1) {
      toast.error('You need at least one payment method');
      return;
    }
    setCards(cards.filter(card => card.id !== cardId));
    toast.success('Card removed');
  };

  const handleSetDefault = (cardId) => {
    setCards(cards.map(card => ({
      ...card,
      isDefault: card.id === cardId
    })));
    toast.success('Default card updated');
  };

  const getCardIcon = (brand) => {
    switch(brand.toLowerCase()) {
      case 'visa': return FaCcVisa;
      case 'mastercard': return FaCcMastercard;
      case 'amex': return FaCcAmex;
      default: return FaCreditCard;
    }
  };

  return (
    <div className="min-h-screen bg-[#03060F] py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate(user?.role === 'driver' ? '/driver' : '/rider')}
              className="text-gray-400 hover:text-white transition-colors mr-4"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#1A6BFF] rounded-xl flex items-center justify-center text-white font-bold text-lg mr-3 shadow-lg shadow-[#1A6BFF]/30">
                V
              </div>
              <h1 className="text-2xl font-bold text-white">Payment Methods</h1>
            </div>
          </div>
          <button
            onClick={() => setShowAddCard(true)}
            className="px-4 py-2 bg-[#1A6BFF] text-white rounded-xl hover:bg-[#5294FF] transition flex items-center shadow-lg shadow-[#1A6BFF]/30"
          >
            <FaPlus className="mr-2" /> Add Card
          </button>
        </div>

        <p className="text-gray-400 mb-6">Manage your payment options</p>

        {/* Cards List - Dark theme */}
        <div className="space-y-4">
          {cards.map((card) => {
            const CardIcon = getCardIcon(card.brand);
            return (
              <div
                key={card.id}
                className="bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] p-4 flex items-center justify-between hover:border-[#1A6BFF] transition"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#080E1F] rounded-xl flex items-center justify-center border border-[#1A2A4A]">
                    <CardIcon className="text-2xl text-[#1A6BFF]" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium text-white">{card.brand} •••• {card.last4}</p>
                      {card.isDefault && (
                        <span className="text-xs bg-[#1A6BFF]/20 text-[#1A6BFF] px-2 py-0.5 rounded-full border border-[#1A6BFF]/20">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">Expires {card.expiry}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {!card.isDefault && (
                    <button
                      onClick={() => handleSetDefault(card.id)}
                      className="text-sm text-[#1A6BFF] hover:text-[#5294FF] transition"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleRemoveCard(card.id)}
                    className="p-2 text-gray-500 hover:text-red-400 transition"
                  >
                    <FaTrash className="text-sm" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Security Info - Dark theme */}
        <div className="mt-6 p-4 bg-[#0E1A2A] rounded-xl border border-[#1A2A4A] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaLock className="text-green-400" />
            <span className="text-sm text-gray-400">Your payment info is secure and encrypted</span>
          </div>
          <FaCheckCircle className="text-green-400" />
        </div>

        {/* Add Card Modal */}
        {showAddCard && (
          <CardPayment
            amount={0}
            onSuccess={(data) => {
              handleAddCard({
                last4: '4321',
                brand: 'Visa',
                expiry: '12/27'
              });
            }}
            onCancel={() => setShowAddCard(false)}
          />
        )}
      </div>
    </div>
  );
};

export default PaymentMethods;