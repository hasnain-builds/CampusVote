import Link from "next/link";
import { Vote, ArrowRight, Activity } from "lucide-react";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import { Mail } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-white flex flex-col justify-between overflow-hidden font-sans">
      {/* Background Decorative Gradients & Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px),linear-gradient(to_bottom,#f1f5f9_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/5 blur-[130px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="relative z-10 border-b border-slate-100/80 bg-white/70 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-2 rounded-xl shadow-md shadow-blue-500/20">
              <Vote className="h-5.5 w-5.5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Campus<span className="text-blue-600">Vote</span>
            </span>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-4xl mx-auto w-full">
        {/* Real-time Indicator */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-100/50 text-blue-700 text-xs font-bold mb-8 animate-fade-in">
          <Activity className="h-3.5 w-3.5 animate-pulse" />
          Universal Digital Voting Platform
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-3">
          Campus<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Vote</span>
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          Smart Digital Election Platform
        </p>

        {/* Small Description */}
        <p className="text-slate-500 max-w-xl text-base sm:text-lg mb-8 leading-relaxed">
          Create live polls, generate instant join codes, and run Class Representative, Batch Representative, or Custom Elections in seconds. No student login required — scan the QR code, enter a roll number, and vote.
        </p>


        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-14 w-full sm:w-auto">
          <Link
            href="/student"
            className="group flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-base shadow-lg shadow-blue-500/15 hover:shadow-xl hover:shadow-blue-500/25 transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Student Join
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/admin-dashboard"
            className="flex items-center justify-center gap-2 px-8 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-semibold text-base border border-slate-200 shadow-xs transition-all duration-200 transform hover:-translate-y-0.5"
          >
            Create Election
          </Link>
        </div>

        {/* Platform Status Info Card */}
        <div className="w-full max-w-sm bg-white border border-slate-100 rounded-3xl p-6 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-all duration-300">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2 mb-3.5 bg-emerald-50 border border-emerald-100 px-3.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[10px] font-bold text-emerald-700 tracking-wider uppercase">Realtime Hub Live</span>
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-1">Join an active election</h3>
            <p className="text-xs text-slate-500 leading-normal">
              Enter the 6-digit code or scan the QR code projected by your administrator to cast your vote.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200 bg-white/50 backdrop-blur-sm py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-6">

          {/* Developer */}
          <div className="text-center">
            <p className="text-sm text-slate-500">
              Designed & Developed by
            </p>

            <h2 className="mt-1 text-2xl font-bold text-slate-900">
              Hasnain <span className="mt-1 text-2xl font-bold text-slate-900">Sheikh</span>
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Connect with the Developer
            </p>
          </div>

          {/* Social Links */}
          <div className="flex flex-wrap items-center justify-center gap-4">

            {/* Instagram */}
            <a
              href="https://instagram.com/hasnain.learn"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-pink-500 via-red-500 to-yellow-500 px-5 py-3 text-white font-medium shadow-md transition-all hover:scale-105"
            >
              <FaInstagram className="text-lg" />
              Instagram
            </a>

            {/* LinkedIn */}
            <a
              href="https://linkedin.com/in/hasnainbuilds"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-xl bg-[#0A66C2] px-5 py-3 text-white font-medium shadow-md transition-all hover:scale-105"
            >
              <FaLinkedin className="text-lg" />
              LinkedIn
            </a>

            {/* Email */}
            <a
              href="mailto:hassu3210@gmail.com"
              className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-slate-700 font-medium shadow-sm transition-all hover:bg-slate-100 hover:scale-105"
            >
              <Mail size={18} />
              Email
            </a>

          </div>

          {/* Copyright */}
          <div className="border-t border-slate-200 pt-5 w-full text-center">
            <p className="text-sm text-slate-500">
              © 2026 <span className="font-semibold text-slate-700">CampusVote</span>. All rights reserved.
            </p>
          </div>

        </div>
      </footer>
    </div>
  );
}