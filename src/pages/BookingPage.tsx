import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, Clock, Video, Star, MapPin, Award, 
  ChevronLeft, ChevronRight, User, CreditCard,
  CheckCircle, ArrowLeft, Heart, Shield, Phone,
  Mail, DollarSign, Lock, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import toast from 'react-hot-toast';
import { trackPayment, trackSessionStart } from '../utils/analyticsManager';

interface Therapist {
  id: string;
  name: string;
  title: string;
  specialization: string[];
  experience: number;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  location: string;
  avatar: string;
  verified: boolean;
  nextAvailable: string;
  bio: string;
  languages: string[];
  availability?: string[];
}

interface TimeSlot {
  time: string;
  available: boolean;
}

interface PaymentInfo {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
  cardholderName: string;
  billingAddress: string;
}

function BookingPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [selectedTherapist, setSelectedTherapist] = useState<Therapist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [currentStep, setCurrentStep] = useState<'therapist' | 'datetime' | 'payment' | 'confirmation'>('therapist');
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: '',
    billingAddress: ''
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [bookingConfirmed, setBookingConfirmed] = useState(false);

  const defaultTherapists: Therapist[] = [
    {
      id: '2',
      name: 'Dr. Sarah Smith',
      title: 'Licensed Clinical Psychologist',
      specialization: ['Cognitive Behavioral Therapy', 'Anxiety Disorders', 'Depression'],
      experience: 8,
      rating: 4.8,
      reviewCount: 127,
      hourlyRate: 120,
      location: 'Online',
      avatar: 'https://images.pexels.com/photos/5327580/pexels-photo-5327580.jpeg?auto=compress&cs=tinysrgb&w=150',
      verified: true,
      nextAvailable: 'Today, 2:00 PM',
      bio: 'Experienced therapist specializing in CBT with a passion for helping patients overcome anxiety and depression.',
      languages: ['English', 'Spanish'],
      availability: [
        'Monday 9:00 AM', 'Monday 10:00 AM', 'Monday 11:00 AM', 'Monday 12:00 PM', 
        'Monday 1:00 PM', 'Monday 2:00 PM', 'Monday 3:00 PM', 'Monday 4:00 PM', 'Monday 5:00 PM',
        'Tuesday 9:00 AM', 'Tuesday 10:00 AM', 'Tuesday 11:00 AM', 'Tuesday 12:00 PM',
        'Tuesday 1:00 PM', 'Tuesday 2:00 PM', 'Tuesday 3:00 PM', 'Tuesday 4:00 PM', 'Tuesday 5:00 PM',
        'Wednesday 9:00 AM', 'Wednesday 10:00 AM', 'Wednesday 11:00 AM', 'Wednesday 12:00 PM',
        'Wednesday 1:00 PM', 'Wednesday 2:00 PM', 'Wednesday 3:00 PM', 'Wednesday 4:00 PM', 'Wednesday 5:00 PM',
        'Thursday 9:00 AM', 'Thursday 10:00 AM', 'Thursday 11:00 AM', 'Thursday 12:00 PM',
        'Thursday 1:00 PM', 'Thursday 2:00 PM', 'Thursday 3:00 PM', 'Thursday 4:00 PM', 'Thursday 5:00 PM',
        'Friday 9:00 AM', 'Friday 10:00 AM', 'Friday 11:00 AM', 'Friday 12:00 PM',
        'Friday 1:00 PM', 'Friday 2:00 PM', 'Friday 3:00 PM', 'Friday 4:00 PM', 'Friday 5:00 PM'
      ]
    }
  ];

  useEffect(() => {
    // Load available therapists
    const savedTherapists = localStorage.getItem('mindcare_therapists');
    if (savedTherapists) {
      const parsed = JSON.parse(savedTherapists);
      setTherapists(parsed);
    } else {
      setTherapists(defaultTherapists);
      localStorage.setItem('mindcare_therapists', JSON.stringify(defaultTherapists));
    }
  }, []);

  useEffect(() => {
    if (selectedTherapist && selectedDate) {
      generateAvailableSlots();
    }
  }, [selectedTherapist, selectedDate]);

  const generateAvailableSlots = () => {
    if (!selectedTherapist) return;

    const dayName = new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long' });
    const therapistAvailability = selectedTherapist.availability || [];
    
    // Get slots for the selected day
    const daySlots = therapistAvailability
      .filter(slot => slot.startsWith(dayName))
      .map(slot => slot.split(' ')[1] + ' ' + slot.split(' ')[2]);

    // Check existing bookings to mark slots as unavailable
    const existingBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
    const dayBookings = existingBookings.filter((booking: any) => 
      booking.date === selectedDate && 
      (booking.therapistId === selectedTherapist.id || booking.therapistName === selectedTherapist.name) &&
      booking.status !== 'cancelled'
    );

    const slots: TimeSlot[] = daySlots.map(time => ({
      time,
      available: !dayBookings.some((booking: any) => booking.time === time)
    }));

    setAvailableSlots(slots);
  };

  const selectTherapist = (therapist: Therapist) => {
    setSelectedTherapist(therapist);
    setCurrentStep('datetime');
  };

  const selectDateTime = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setCurrentStep('payment');
  };

  const handlePaymentInputChange = (field: keyof PaymentInfo, value: string) => {
    setPaymentInfo(prev => ({ ...prev, [field]: value }));
  };

  const validatePaymentInfo = (): boolean => {
    if (!paymentInfo.cardNumber || paymentInfo.cardNumber.length < 16) {
      toast.error('Please enter a valid card number');
      return false;
    }
    if (!paymentInfo.expiryDate || !/^\d{2}\/\d{2}$/.test(paymentInfo.expiryDate)) {
      toast.error('Please enter expiry date in MM/YY format');
      return false;
    }
    if (!paymentInfo.cvv || paymentInfo.cvv.length < 3) {
      toast.error('Please enter a valid CVV');
      return false;
    }
    if (!paymentInfo.cardholderName.trim()) {
      toast.error('Please enter cardholder name');
      return false;
    }
    return true;
  };

  const processPayment = async () => {
    if (!validatePaymentInfo()) return;
    if (!selectedTherapist || !selectedDate || !selectedTime) return;

    setIsProcessingPayment(true);

    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Create booking only after successful payment
      const newBooking = {
        id: Date.now().toString(),
        patientId: user?.id,
        patientName: user?.name,
        patientEmail: user?.email,
        therapistId: selectedTherapist.id,
        therapistName: selectedTherapist.name,
        date: selectedDate,
        time: selectedTime,
        duration: 50,
        sessionType: 'video',
        amount: `$${selectedTherapist.hourlyRate}`,
        status: 'pending_confirmation',
        createdAt: new Date().toISOString(),
        paymentStatus: 'completed',
        paymentMethod: `****${paymentInfo.cardNumber.slice(-4)}`,
        notes: `Video therapy session with ${selectedTherapist.name}`
      };

      // Save booking to localStorage
      const existingBookings = JSON.parse(localStorage.getItem('mindcare_bookings') || '[]');
      const updatedBookings = [...existingBookings, newBooking];
      localStorage.setItem('mindcare_bookings', JSON.stringify(updatedBookings));

      // Track payment and session start in analytics
      trackPayment({
        patientId: user?.id,
        therapistId: selectedTherapist.id,
        amount: `$${selectedTherapist.hourlyRate}`,
        sessionType: 'video'
      });

      trackSessionStart({
        patientId: user?.id,
        therapistId: selectedTherapist.id,
        sessionType: 'video',
        duration: 50
      });

      // Dispatch custom event for real-time updates
      window.dispatchEvent(new CustomEvent('mindcare-data-updated'));

      setBookingConfirmed(true);
      setCurrentStep('confirmation');
      toast.success('Payment successful! Your session has been booked.');

    } catch (error) {
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const resetBooking = () => {
    setSelectedTherapist(null);
    setSelectedDate('');
    setSelectedTime('');
    setCurrentStep('therapist');
    setPaymentInfo({
      cardNumber: '',
      expiryDate: '',
      cvv: '',
      cardholderName: '',
      billingAddress: ''
    });
    setBookingConfirmed(false);
  };

  const getNextAvailableDate = () => {
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      
      if (selectedTherapist?.availability?.some(slot => slot.startsWith(dayName))) {
        return dateString;
      }
    }
    return today.toISOString().split('T')[0];
  };

  const formatCardNumber = (value: string) => {
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
      return v;
    }
  };

  const formatExpiryDate = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    if (v.length >= 2) {
      return v.substring(0, 2) + '/' + v.substring(2, 4);
    }
    return v;
  };

  return (
    <div className={`h-screen flex flex-col ${
      theme === 'dark' ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-blue-50 to-teal-50'
    }`}>
      <div className="flex-1 overflow-y-auto p-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold mb-2 ${
                theme === 'dark' ? 'text-white' : 'text-gray-800'
              }`}>
                Book a Therapy Session
              </h1>
              <p className={`text-base ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Connect with licensed therapists for personalized support
              </p>
            </div>
            {currentStep !== 'therapist' && (
              <button
                onClick={() => {
                  if (currentStep === 'datetime') setCurrentStep('therapist');
                  else if (currentStep === 'payment') setCurrentStep('datetime');
                  else if (currentStep === 'confirmation') resetBooking();
                }}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                } shadow-lg`}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Progress Steps */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`mb-6 p-4 rounded-xl shadow-lg ${
            theme === 'dark' ? 'bg-gray-800' : 'bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            {[
              { id: 'therapist', label: 'Select Therapist', icon: User },
              { id: 'datetime', label: 'Choose Date & Time', icon: Calendar },
              { id: 'payment', label: 'Payment', icon: CreditCard },
              { id: 'confirmation', label: 'Confirmation', icon: CheckCircle }
            ].map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                  currentStep === step.id
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                    : index < ['therapist', 'datetime', 'payment', 'confirmation'].indexOf(currentStep)
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-400'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  <step.icon className="w-4 h-4" />
                  <span className="text-sm font-medium hidden md:inline">{step.label}</span>
                </div>
                {index < 3 && (
                  <div className={`w-8 h-0.5 mx-2 ${
                    index < ['therapist', 'datetime', 'payment', 'confirmation'].indexOf(currentStep)
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          {currentStep === 'therapist' && (
            <motion.div
              key="therapist"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {therapists.map((therapist, index) => (
                <motion.div
                  key={therapist.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5, scale: 1.02 }}
                  onClick={() => selectTherapist(therapist)}
                  className={`p-4 rounded-xl shadow-lg cursor-pointer transition-all duration-300 ${
                    theme === 'dark' ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <img
                      src={therapist.avatar}
                      alt={therapist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-semibold ${
                          theme === 'dark' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {therapist.name}
                        </h3>
                        {therapist.verified && (
                          <Shield className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {therapist.title}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="flex items-center space-x-2">
                      <Award className="w-4 h-4 text-purple-500" />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {therapist.experience} years experience
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        {therapist.rating} ({therapist.reviewCount} reviews)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-semibold text-green-600`}>
                        ${therapist.hourlyRate}/session
                      </span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <p className={`text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Specializations:
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {therapist.specialization.slice(0, 2).map((spec, idx) => (
                        <span
                          key={idx}
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            theme === 'dark' ? 'bg-purple-900/50 text-purple-300' : 'bg-purple-100 text-purple-700'
                          }`}
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  </div>

                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Next available: {therapist.nextAvailable}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          )}

          {currentStep === 'datetime' && selectedTherapist && (
            <motion.div
              key="datetime"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              {/* Date Selection */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Select Date
                </h3>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 14 }, (_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dateString = date.toISOString().split('T')[0];
                    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
                    const dayNumber = date.getDate();
                    
                    const hasAvailability = selectedTherapist.availability?.some(slot => 
                      slot.startsWith(date.toLocaleDateString('en-US', { weekday: 'long' }))
                    );

                    return (
                      <motion.button
                        key={dateString}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          if (hasAvailability) {
                            setSelectedDate(dateString);
                          }
                        }}
                        disabled={!hasAvailability}
                        className={`p-2 rounded-lg text-center transition-all duration-200 ${
                          selectedDate === dateString
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : hasAvailability
                            ? theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        <div className="text-xs">{dayName}</div>
                        <div className="text-sm font-semibold">{dayNumber}</div>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Time Selection */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Available Times
                  {selectedDate && (
                    <span className={`text-sm font-normal ml-2 ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      for {new Date(selectedDate).toLocaleDateString()}
                    </span>
                  )}
                </h3>
                
                {selectedDate ? (
                  <div className="grid grid-cols-2 gap-2">
                    {availableSlots.map((slot) => (
                      <motion.button
                        key={slot.time}
                        whileHover={{ scale: slot.available ? 1.02 : 1 }}
                        whileTap={{ scale: slot.available ? 0.98 : 1 }}
                        onClick={() => {
                          if (slot.available) {
                            selectDateTime(selectedDate, slot.time);
                          }
                        }}
                        disabled={!slot.available}
                        className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                          selectedTime === slot.time
                            ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white'
                            : slot.available
                            ? theme === 'dark'
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {slot.time}
                        {!slot.available && (
                          <div className="text-xs mt-1">Booked</div>
                        )}
                      </motion.button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className={`w-12 h-12 mx-auto mb-4 ${
                      theme === 'dark' ? 'text-gray-600' : 'text-gray-400'
                    }`} />
                    <p className={`${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      Please select a date first
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {currentStep === 'payment' && selectedTherapist && selectedDate && selectedTime && (
            <motion.div
              key="payment"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              {/* Booking Summary */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Booking Summary
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <img
                      src={selectedTherapist.avatar}
                      alt={selectedTherapist.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    <div>
                      <h4 className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {selectedTherapist.name}
                      </h4>
                      <p className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {selectedTherapist.title}
                      </p>
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Date & Time:
                      </span>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        {new Date(selectedDate).toLocaleDateString()} at {selectedTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Duration:
                      </span>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        50 minutes
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        Session Type:
                      </span>
                      <span className={`font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        Video Call
                      </span>
                    </div>
                    <hr className={`my-2 ${
                      theme === 'dark' ? 'border-gray-600' : 'border-gray-200'
                    }`} />
                    <div className="flex items-center justify-between">
                      <span className={`font-semibold ${
                        theme === 'dark' ? 'text-white' : 'text-gray-800'
                      }`}>
                        Total:
                      </span>
                      <span className="text-xl font-bold text-green-600">
                        ${selectedTherapist.hourlyRate}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Form */}
              <div className={`p-4 rounded-xl shadow-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Payment Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Card Number
                    </label>
                    <div className="relative">
                      <CreditCard className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                        theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                      }`} />
                      <input
                        type="text"
                        value={paymentInfo.cardNumber}
                        onChange={(e) => handlePaymentInputChange('cardNumber', formatCardNumber(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Expiry Date
                      </label>
                      <input
                        type="text"
                        value={paymentInfo.expiryDate}
                        onChange={(e) => handlePaymentInputChange('expiryDate', formatExpiryDate(e.target.value))}
                        placeholder="MM/YY"
                        maxLength={5}
                        className={`w-full px-3 py-3 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        CVV
                      </label>
                      <input
                        type="text"
                        value={paymentInfo.cvv}
                        onChange={(e) => handlePaymentInputChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        maxLength={4}
                        className={`w-full px-3 py-3 rounded-lg border ${
                          theme === 'dark'
                            ? 'bg-gray-700 border-gray-600 text-white'
                            : 'bg-white border-gray-300 text-gray-900'
                        } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Cardholder Name
                    </label>
                    <input
                      type="text"
                      value={paymentInfo.cardholderName}
                      onChange={(e) => handlePaymentInputChange('cardholderName', e.target.value)}
                      placeholder="John Doe"
                      className={`w-full px-3 py-3 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Billing Address
                    </label>
                    <input
                      type="text"
                      value={paymentInfo.billingAddress}
                      onChange={(e) => handlePaymentInputChange('billingAddress', e.target.value)}
                      placeholder="123 Main St, City, State 12345"
                      className={`w-full px-3 py-3 rounded-lg border ${
                        theme === 'dark'
                          ? 'bg-gray-700 border-gray-600 text-white'
                          : 'bg-white border-gray-300 text-gray-900'
                      } focus:outline-none focus:ring-2 focus:ring-purple-500`}
                    />
                  </div>

                  {/* Security Notice */}
                  <div className={`p-3 rounded-lg ${
                    theme === 'dark' ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-green-500" />
                      <span className={`text-sm font-medium ${
                        theme === 'dark' ? 'text-green-300' : 'text-green-700'
                      }`}>
                        Your payment information is secure and encrypted
                      </span>
                    </div>
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={processPayment}
                    disabled={isProcessingPayment}
                    className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingPayment ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                        <span>Processing Payment...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        <span>Pay ${selectedTherapist.hourlyRate} & Book Session</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 'confirmation' && bookingConfirmed && (
            <motion.div
              key="confirmation"
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              className="max-w-2xl mx-auto"
            >
              <div className={`p-6 rounded-xl shadow-lg text-center ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white'
              }`}>
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
                
                <h2 className={`text-2xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-white' : 'text-gray-800'
                }`}>
                  Booking Confirmed!
                </h2>
                
                <p className={`text-lg mb-6 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  Your therapy session has been successfully booked and paid for.
                </p>

                <div className={`p-4 rounded-lg mb-6 ${
                  theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'
                }`}>
                  <h4 className={`font-semibold mb-3 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-800'
                  }`}>
                    Session Details:
                  </h4>
                  <div className="space-y-2 text-left">
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Therapist:
                      </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {selectedTherapist?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Date:
                      </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {new Date(selectedDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Time:
                      </span>
                      <span className={theme === 'dark' ? 'text-white' : 'text-gray-800'}>
                        {selectedTime}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>
                        Amount Paid:
                      </span>
                      <span className="font-bold text-green-600">
                        ${selectedTherapist?.hourlyRate}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded-lg mb-6 ${
                  theme === 'dark' ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-200'
                }`}>
                  <p className={`text-sm ${
                    theme === 'dark' ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    You will receive a confirmation email with the video call link. 
                    The therapist will also be notified and will confirm the appointment.
                  </p>
                </div>

                <div className="flex space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetBooking}
                    className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
                  >
                    Book Another Session
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.history.back()}
                    className={`flex-1 py-3 rounded-xl font-semibold ${
                      theme === 'dark'
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Back to Dashboard
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default BookingPage;