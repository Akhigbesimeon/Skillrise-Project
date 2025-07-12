import React from 'react';
import { Link } from 'react-router-dom';

const Register = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-white font-sans px-4 py-8">
      {/* Left Side - Illustration and Text */}
      <div className="w-full md:w-1/2 flex flex-col items-center text-center px-4 md:px-12">
        <img
          src="/assets/signup-illustration.png" // replace with actual path or hosted image
          alt="Skillrise Sign Up"
          className="w-64 h-auto mb-6"
        />
        <h2 className="text-2xl md:text-3xl font-semibold mb-2">
          Discover, Learn, Grow with Skillrise
        </h2>
        <p className="text-gray-600">Begin Your Journey with Skillrise</p>
      </div>

      {/* Right Side - Form */}
      <div className="w-full md:w-1/2 mt-10 md:mt-0 px-4 md:px-12">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign Up</h2>
          <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet consectetur.</p>
          <form className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                type="text"
                placeholder="Your Name"
                className="w-full mt-1 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Email Address</label>
              <input
                type="email"
                placeholder="myemail@gmail.com"
                className="w-full mt-1 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Password</label>
              <input
                type="password"
                placeholder="********"
                className="w-full mt-1 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700">Confirm Password</label>
              <input
                type="password"
                placeholder="********"
                className="w-full mt-1 px-4 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
            >
              SIGN UP
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 hover:underline">
              sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
