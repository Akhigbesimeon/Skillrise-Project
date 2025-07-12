import React from 'react';
import { Link } from 'react-router-dom';

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center bg-white font-sans px-4 py-8">
      {/* Left Side - Illustration and Text */}
      <div className="w-full md:w-1/2 flex flex-col items-center text-center px-4 md:px-12">
        <img
          src="/assets/login-illustration.png" // replace with actual image path
          alt="Skillrise Sign In"
          className="w-64 h-auto mb-6"
        />
        <h2 className="text-2xl md:text-3xl font-semibold mb-2">
          Ignite Your Curiosity
        </h2>
        <p className="text-gray-600">Continue Your Journey with Skillrise</p>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full md:w-1/2 mt-10 md:mt-0 px-4 md:px-12">
        <div className="max-w-md w-full mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
          <p className="text-gray-600 mb-6">Lorem ipsum dolor sit amet consectetur.</p>
          <form className="space-y-4">
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
              <div className="text-right text-sm text-blue-500 mt-1 cursor-pointer hover:underline">
                Forgot password?
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded-md font-semibold hover:bg-blue-700 transition"
            >
              SIGN IN
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Don’t have an account?{' '}
            <Link to="/register" className="text-blue-600 hover:underline">
              sign up now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
