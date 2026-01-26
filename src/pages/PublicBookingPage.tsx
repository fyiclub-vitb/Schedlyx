// src/pages/Home.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center text-center pt-20 px-4">
      
      {/* 1. The Main Hero Text */}
      <h1 className="text-4xl md:text-6xl font-bold text-slate-900 mb-6 tracking-tight">
        Smart Scheduling Made Simple
      </h1>
      
      <p className="text-lg text-slate-600 max-w-2xl mb-8 leading-relaxed">
        The open-source platform that combines the best of Calendly, 
        Eventbrite, and hackathon tools into one powerful scheduling solution.
      </p>

      {/* 2. The Buttons */}
      <div className="flex gap-4 mb-12">
        <Link 
          to="/u/pratyyyk" 
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl"
        >
          Get Started Free
        </Link>
        {/* Added a Demo Link for you to test easily */}
        <Link 
          to="/u/pratyyyk" 
          className="bg-white text-slate-700 border border-slate-200 px-8 py-3 rounded-lg font-semibold hover:bg-slate-50 transition"
        >
          View Demo Page
        </Link>
      </div>

      {/* 3. The Dashboard Image Placeholder */}
      <div className="relative w-full max-w-5xl mx-auto rounded-xl shadow-2xl overflow-hidden border border-slate-200 bg-white">
         {/* If you have the original image file, use: <img src={dashboardImg} /> */}
         {/* Otherwise, this placeholder mimics your screenshot: */}
         <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
            <div className="ml-4 text-xs text-slate-400 font-mono">dashboard.schedlyx.com</div>
         </div>
         <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="col-span-1 md:col-span-3 h-64 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                [Dashboard Screenshot Placeholder]
            </div>
         </div>
      </div>

      <div className="h-20"></div> {/* Spacing at bottom */}
    </div>
  );
};

export default Home;