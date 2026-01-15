'use client';

import { useDoctors } from '@/hooks/useBooking';
import { useClinicalServices } from '@/hooks/useClinicalServices';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import {
    Sparkles,
    ArrowRight,
    LayoutDashboard,
    LogOut,
    UserCircle,
    UserPlus,
} from 'lucide-react';
import { getFullName } from '@/lib/utils';
import { useState, useEffect } from 'react';

/**
 * Independent Discovery Hub
 * 
 * A premium standalone landing page that serves as the gateway
 * to Nairobi Sculpt's clinical expertise.
 */
export default function DiscoverPage() {
    const { data: services, isLoading: isLoadingServices } = useClinicalServices();
    const { data: experts, isLoading: isLoadingExperts } = useDoctors();
    const { logout, isAuthenticated } = useAuth();
    const [isScrolled, setIsScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <div className="min-h-screen bg-white">
            {/* 1. STANDALONE PREMIUM NAVBAR */}
            <nav
                className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 md:px-12 py-4 flex items-center justify-between ${isScrolled ? 'bg-white shadow-xl py-3' : 'bg-transparent py-5'
                    }`}
            >
                <Link href="/patient/discover" className="flex items-center gap-3 group">
                    <div className="flex-shrink-0 w-10 h-10 bg-brand-gold rounded-xl flex items-center justify-center shadow-lg transform rotate-0 group-hover:-rotate-6 transition-transform">
                        <span className="text-brand-teal font-black text-xl italic">S</span>
                    </div>
                    <div className="hidden sm:block">
                        <h1 className={`font-bold text-lg tracking-tight leading-none uppercase transition-colors ${isScrolled ? 'text-brand-teal' : 'text-white'}`}>Nairobi</h1>
                        <p className="text-brand-gold font-medium text-sm tracking-widest uppercase mt-0.5">Sculpt</p>
                    </div>
                </Link>

                <div className="flex items-center gap-6">
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/patient/dashboard"
                                className={`text-sm font-bold flex items-center gap-2 transition-colors ${isScrolled ? 'text-brand-teal hover:text-brand-gold' : 'text-white hover:text-brand-gold'
                                    }`}
                            >
                                <LayoutDashboard className="h-4 w-4" />
                                My Dashboard
                            </Link>
                            <button
                                onClick={() => logout()}
                                className={`text-sm font-bold flex items-center gap-2 transition-colors ${isScrolled ? 'text-neutral-500 hover:text-red-500' : 'text-white/80 hover:text-white'
                                    }`}
                            >
                                <LogOut className="h-4 w-4" />
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className={`text-sm font-bold flex items-center gap-2 transition-colors ${isScrolled ? 'text-brand-teal hover:text-brand-gold' : 'text-white hover:text-brand-gold'
                                    }`}
                            >
                                <UserCircle className="h-4 w-4" />
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className={`px-5 py-2.5 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${isScrolled
                                    ? 'bg-brand-gold text-white hover:bg-brand-gold-dark shadow-lg shadow-brand-gold/20'
                                    : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white/20'
                                    }`}
                            >
                                <UserPlus className="h-4 w-4" />
                                Join Now
                            </Link>
                        </>
                    )}
                </div>
            </nav>

            {/* 2. IMMERSIVE HERO SECTION */}
            <section className="relative h-screen w-full overflow-hidden bg-brand-teal">
                <div className="absolute inset-0 scale-105 animate-slow-zoom">
                    <img
                        src="/images/patient_portal_hero.png"
                        alt="Nairobi Sculpt Hero"
                        className="h-full w-full object-cover opacity-60"
                    />
                </div>
                <div className="absolute inset-0 bg-gradient-to-b from-brand-teal/40 via-brand-teal/60 to-brand-teal" />

                <div className="relative h-full max-w-7xl mx-auto px-6 md:px-12 flex flex-col justify-center items-center text-center">
                    <div className="max-w-3xl slide-in-bottom">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-gold/20 border border-brand-gold/30 text-brand-gold text-xs font-bold tracking-[0.2em] uppercase mb-8 backdrop-blur-md">
                            <Sparkles className="h-3.5 w-3.5" />
                            The Art of Transformation
                        </div>
                        <h1 className="text-6xl md:text-8xl font-serif text-white mb-6 leading-[1.1] tracking-tight">
                            A Masterpiece <br />
                            <span className="text-brand-gold">In Every Detail</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-neutral-200 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
                            Where Nairobi's elite clinical expertise meets an uncompromising vision for aesthetic perfection.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                            <Link
                                href={isAuthenticated ? "/patient/book" : "/login"}
                                className="group px-10 py-5 bg-brand-gold text-white rounded-full font-bold text-lg hover:bg-brand-gold-dark transition-all transform hover:-translate-y-1 shadow-2xl flex items-center gap-3 min-w-[240px] justify-center"
                            >
                                {isAuthenticated ? "Inquire Now" : "Sign In to Book"}
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link
                                href={isAuthenticated ? "/patient/dashboard" : "/register"}
                                className="px-10 py-5 bg-white/5 backdrop-blur-lg text-white border border-white/20 rounded-full font-bold text-lg hover:bg-white/10 transition-all flex items-center gap-3 min-w-[240px] justify-center"
                            >
                                {isAuthenticated ? "Go to Dashboard" : "Register Now"}
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. CLINICAL SOLUTIONS (ENHANCED SPACING) */}
            <section className="py-32 bg-slate-50">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="text-center max-w-2xl mx-auto mb-20">
                        <h2 className="text-4xl md:text-5xl font-serif text-brand-teal mb-6">Exceptional Care Models</h2>
                        <div className="h-1 w-20 bg-brand-gold mx-auto mb-8" />
                        <p className="text-lg text-neutral-600 leading-relaxed font-medium">
                            Every procedure at Nairobi Sculpt is a bespoke journey, tailored specifically to your clinical needs and aesthetic aspirations.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
                        {isLoadingServices ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="aspect-[3/4] rounded-[2rem] bg-white animate-pulse border border-slate-200" />
                            ))
                        ) : (
                            services?.map((service) => (
                                <Link
                                    key={service.id}
                                    href={`/patient/book?service=${service.code}`}
                                    className="group relative aspect-[3/4] rounded-[2.5rem] overflow-hidden shadow-2xl hover:shadow-brand-gold/10 transition-all duration-700"
                                >
                                    {service.imageUrl && (
                                        <img
                                            src={service.imageUrl}
                                            alt={service.name}
                                            className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                                    <div className="absolute bottom-0 left-0 right-0 p-8 text-white transition-all duration-500 transform translate-y-4 group-hover:translate-y-0">
                                        <h3 className="text-2xl font-serif mb-4">{service.name}</h3>
                                        <div className="h-0.5 w-0 group-hover:w-full bg-brand-gold transition-all duration-700 mb-4" />
                                        <p className="text-sm text-neutral-300 opacity-0 group-hover:opacity-100 transition-opacity line-clamp-3 leading-relaxed">
                                            {service.description}
                                        </p>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* 4. SURGICAL EXCELLENCE SECTION */}
            <section className="py-32 bg-white overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 md:px-12">
                    <div className="flex flex-col lg:flex-row items-center gap-20">
                        <div className="lg:w-1/2 relative">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-beige/50 rounded-full blur-3xl" />
                            <div className="relative rounded-[3rem] overflow-hidden shadow-2xl">
                                <img src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=800&auto=format&fit=crop" alt="Clinical Center" className="w-full h-auto" />
                                <div className="absolute inset-0 bg-brand-teal/10 mix-blend-multiply" />
                            </div>
                        </div>

                        <div className="lg:w-1/2">
                            <h2 className="text-4xl md:text-5xl font-serif text-brand-teal mb-8 leading-[1.2]">
                                World-Class Clinical <br />
                                Standards in <span className="text-brand-gold">East Africa</span>
                            </h2>
                            <p className="text-lg text-neutral-600 mb-10 leading-relaxed">
                                Nairobi Sculpt is not just a clinic; it is a center of excellence that brings together advanced medical technology and the highest levels of patient safety protocols common in global aesthetic hubs.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {[
                                    "Bespoke Consultation Service",
                                    "Advanced Pre-Op Simulation",
                                    "24/7 Post-Operative Support",
                                    "Multi-Disciplinary Medical Team"
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-4 p-5 rounded-2xl bg-slate-50 border border-slate-100">
                                        <div className="h-6 w-6 rounded-full bg-brand-gold text-white flex items-center justify-center font-bold text-xs">{i + 1}</div>
                                        <p className="text-sm font-bold text-brand-teal">{item}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 5. EXPERT PANEL (CRISPY CARDS) */}
            <section className="py-32 bg-brand-teal relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 text-center mb-24">
                    <h2 className="text-4xl md:text-6xl font-serif text-white mb-6">Master Surgeons</h2>
                    <p className="text-brand-gold text-lg md:text-xl font-medium tracking-widest uppercase">The Clinical Vanguard</p>
                </div>

                <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-10">
                        {isLoadingExperts ? (
                            Array(5).fill(0).map((_, i) => (
                                <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse border border-white/10" />
                            ))
                        ) : (
                            experts?.map((expert) => (
                                <div key={expert.id} className="group flex flex-col items-center">
                                    <div className="relative w-full aspect-[4/5] rounded-[3rem] overflow-hidden mb-8 border border-white/10 shadow-2xl">
                                        <img
                                            src={expert.doctorProfile?.profilePictureUrl || `https://ui-avatars.com/api/?name=${expert.firstName}+${expert.lastName}&background=transparent&color=C5A25D`}
                                            alt={expert.firstName}
                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-brand-teal/90 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                                    </div>
                                    <h3 className="text-white text-xl font-bold mb-2">{getFullName(expert.firstName, expert.lastName)}</h3>
                                    <p className="text-brand-gold text-xs font-bold uppercase tracking-[0.2em] mb-4">
                                        {expert.doctorProfile?.specialty || expert.title || 'Consultant Surgeon'}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </section>

            {/* 6. CALL TO ACTION */}
            <section className="py-40 bg-brand-beige">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-5xl md:text-7xl font-serif text-brand-teal mb-10 leading-[1.1]">
                        Ready to <span className="italic text-brand-gold">begin?</span>
                    </h2>
                    <p className="text-xl text-neutral-600 mb-16 leading-relaxed max-w-2xl mx-auto">
                        Your transformative journey is designed with clinical precision and executed with surgical artistry.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
                        <Link
                            href={isAuthenticated ? "/patient/book" : "/login"}
                            className="group w-full sm:w-auto px-16 py-6 bg-brand-teal text-white rounded-full font-bold text-xl hover:bg-brand-teal-dark transition-all transform hover:-translate-y-1 shadow-2xl flex items-center justify-center gap-4"
                        >
                            {isAuthenticated ? "Book Your Transformation" : "Sign In to Start"}
                        </Link>
                    </div>

                    <div className="mt-24 pt-20 border-t border-brand-teal/10 flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-brand-gold rounded-full flex items-center justify-center">
                                <span className="text-brand-teal font-black text-xl italic leading-none">S</span>
                            </div>
                            <div className="text-left leading-none">
                                <p className="text-brand-teal font-bold text-lg tracking-tight uppercase">Nairobi</p>
                                <p className="text-brand-gold font-medium text-xs tracking-[0.3em] uppercase">Sculpt</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-10">
                            <Link href="/patient/dashboard" className="text-brand-teal/60 hover:text-brand-teal text-sm font-bold uppercase tracking-wider">Dashboard</Link>
                            <Link href="/patient/profile" className="text-brand-teal/60 hover:text-brand-teal text-sm font-bold uppercase tracking-wider">Profile</Link>
                            <Link href="/patient/book" className="text-brand-teal/60 hover:text-brand-teal text-sm font-bold uppercase tracking-wider">Booking</Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
