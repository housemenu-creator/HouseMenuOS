import { useRef } from 'react';
import {
    Ticket,
    ShieldCheck,
    Zap,
    Award,
    ChevronRight,
    Lock,
    Cpu,
    Loader2
} from 'lucide-react';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import RaffleCard from '../components/shared/RaffleCard';
import StepCard from '../components/shared/StepCard';
import { useRaffles } from '../hooks/useRaffles';

export const Home = () => {
    const rafflesRef = useRef<HTMLDivElement>(null);
    const { raffles, loading } = useRaffles();

    const scrollToRaffles = () => {
        rafflesRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatPrice = (price: number) => `S/ ${price.toFixed(2)}`;

    return (
        <>
            {/* Hero Section */}
            <header className="section text-center py-24">
                <div className="container">
                    <Badge className="mb-4">✨ La Nueva Era de los Sorteos</Badge>
                    <h1 className="mt-4 max-w-3xl mx-auto">
                        Tu Suerte Potenciada por <span className="text-cyan-400">IA & Blockchain</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto my-6">
                        Participa en sorteos exclusivos pagando con Yape.
                        <strong className="text-white">Solayni</strong> verifica tu pago al instante y asegura tu victoria con código inmutable.
                    </p>
                    <div className="flex justify-center gap-4 mt-8">
                        <Button onClick={scrollToRaffles}>
                            Ver Sorteos Activos <ChevronRight size={20} />
                        </Button>
                        <Button variant="outline">
                            <ShieldCheck size={20} className="mr-2 text-amber-400" />
                            Auditoría en vivo
                        </Button>
                    </div>
                </div>
            </header>

            {/* Stats / Trust Banner */}
            <div className="bg-slate-800/20 py-8 border-y border-slate-800">
                <div className="container grid grid-3 text-center">
                    <div>
                        <h3 className="text-amber-400">100%</h3>
                        <p className="text-slate-400">Justicia con Blockchain</p>
                    </div>
                    <div>
                        <h3 className="text-cyan-400">IA</h3>
                        <p className="text-slate-400">Verificación Instantánea</p>
                    </div>
                    <div>
                        <h3 className="text-amber-400">Soles</h3>
                        <p className="text-slate-400">Pagos Locales</p>
                    </div>
                </div>
            </div>

            {/* Featured Raffles */}
            <section ref={rafflesRef} className="section" id="sorteos">
                <div className="container">
                    <div className="flex justify-between items-end mb-12">
                        <div>
                            <h2 className="text-white">Sorteos Destacados</h2>
                            <p className="text-slate-400">Participa antes de que se agoten los tickets.</p>
                        </div>
                        <a href="#" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
                            Ver todos <ChevronRight size={20} />
                        </a>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {loading ? (
                            <div className="col-span-full text-center p-12">
                                <Loader2 size={24} className="text-cyan-400 animate-spin mx-auto" />
                                <p className="text-slate-400 mt-4">Cargando sorteos...</p>
                            </div>
                        ) : raffles.length > 0 ? (
                            raffles.map(raffle => (
                                <RaffleCard
                                    key={raffle.id}
                                    id={raffle.id}
                                    image={raffle.imageUrl}
                                    title={raffle.title}
                                    price={formatPrice(raffle.pricePerTicket)}
                                    totalTickets={raffle.totalTickets}
                                    soldTickets={raffle.soldTickets}
                                    drawDate={raffle.drawDate}
                                    urgent={raffle.soldTickets / raffle.totalTickets > 0.9}
                                />
                            ))
                        ) : (
                            <>
                                <RaffleCard
                                    id="demo-1"
                                    image="https://images.unsplash.com/photo-1603386329225-868f9b1ee6c9?auto=format&fit=crop&q=80&w=600"
                                    title="MacBook Pro M3"
                                    price="S/ 25.00"
                                    totalTickets={100}
                                    soldTickets={65}
                                    drawDate="18 de Enero"
                                />
                                <RaffleCard
                                    id="demo-2"
                                    image="https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&q=80&w=600"
                                    title="Moto Yamaha R3"
                                    price="S/ 50.00"
                                    totalTickets={500}
                                    soldTickets={120}
                                    drawDate="30 de Enero"
                                />
                                <RaffleCard
                                    id="demo-3"
                                    image="https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=600"
                                    title="Paquete Efectivo 5k"
                                    price="S/ 10.00"
                                    totalTickets={200}
                                    soldTickets={190}
                                    drawDate="Mañana!"
                                    urgent
                                />
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* How it Works */}
            <section className="section bg-slate-900/50" id="como-funciona">
                <div className="container">
                    <div className="text-center mb-16">
                        <h2>¿Cómo Participar?</h2>
                        <p className="text-slate-400 mt-2">Tan fácil como enviar un Yape.</p>
                    </div>

                    <div className="grid grid-3 gap-8">
                        <StepCard
                            icon={<Ticket size={24} className="text-cyan-400" />}
                            step="01"
                            title="Elige tu Sorteo"
                            desc="Navega por nuestra lista de premios premium y selecciona el que más te guste."
                        />
                        <StepCard
                            icon={<Zap size={24} className="text-amber-400" />}
                            step="02"
                            title="Paga con Yape/Plin"
                            desc="Escanea el QR, realiza el pago en soles y recibe tu ticket digital al instante."
                        />
                        <StepCard
                            icon={<Award size={24} className="text-cyan-400" />}
                            step="03"
                            title="Gana Automáticamente"
                            desc="El contrato inteligente selecciona al ganador cuando se venden los tickets o llega la fecha."
                        />
                    </div>
                </div>
            </section>

            {/* Blockchain Trust Section */}
            <section className="section text-center" id="transparencia">
                <div className="container max-w-3xl mx-auto">
                    <div className="mb-8 inline-flex p-4 rounded-full bg-cyan-400/10">
                        <Cpu size={24} className="text-cyan-400" />
                    </div>
                    <h2>Filosofía <span className="text-amber-400">Ayni</span> & Blockchain</h2>
                    <p className="text-lg text-slate-400 mb-12 mt-4">
                        <strong className="text-slate-300">Ayni</strong> es el principio inca de reciprocidad y mutuo beneficio.
                        En <strong className="text-slate-300">Solayni</strong>, recuperamos este valor ancestral usando tecnología moderna.<br /><br />
                        Nuestro <strong className="text-cyan-400">Contrato Inteligente</strong> garantiza que cada participación sea respetada
                        con absoluta justicia, sin intermediarios corruptibles.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-left bg-slate-900 p-8 rounded-2xl border border-slate-800">
                        <div className="flex gap-4">
                            <Lock className="text-amber-400 shrink-0" size={24} />
                            <div>
                                <h4 className="mb-2 text-white">Inmutabilidad</h4>
                                <p className="text-sm text-slate-400">Nadie puede alterar los participantes ni el resultado una vez iniciado el sorteo.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <ShieldCheck className="text-amber-400 shrink-0" size={24} />
                            <div>
                                <h4 className="mb-2 text-white">Verificabilidad</h4>
                                <p className="text-sm text-slate-400">Cualquier persona puede auditar el código y las transacciones en tiempo real.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
};
