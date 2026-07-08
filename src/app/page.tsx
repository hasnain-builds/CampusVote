import Link from "next/link";
import { Vote, ArrowRight, Activity } from "lucide-react";

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
          Live voting for Classrooms
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 mb-3">
          Campus<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Vote</span>
        </h1>
        <p className="text-xl sm:text-2xl font-bold text-slate-800 mb-6">
          Real-Time Classroom Election Platform
        </p>

        {/* Small Description */}
        <p className="text-slate-500 max-w-xl text-base sm:text-lg mb-10 leading-relaxed">
          Create live polls, generate instant join codes, and gather student votes in seconds. No login, no accounts, no password hassles. Scan the QR code, enter a roll number, and vote.
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
              Enter the 6-digit code or scan the QR code projected by your teacher to cast your vote.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-100 bg-white/40 py-6 text-center">
        <p className="text-xs font-medium text-slate-400">
          Designed & Developed by <span className="text-slate-500 font-semibold hover:text-blue-600 transition-colors">Hasnain Sheikh</span>
        </p>
      </footer>
    </div>
  );
}