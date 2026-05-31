import { useState, useEffect } from "react";

interface ChronometerProps {
  startDateStr: string;
}

export default function Chronometer({ startDateStr }: ChronometerProps) {
  const [timeDiff, setTimeDiff] = useState({
    years: 0,
    months: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateDifference = () => {
      const start = new Date(startDateStr);
      const now = new Date();

      if (isNaN(start.getTime()) || start > now) {
        setTimeDiff({ years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // Exact Date Calendar Difference algorithm
      let years = now.getFullYear() - start.getFullYear();
      let months = now.getMonth() - start.getMonth();
      let days = now.getDate() - start.getDate();
      let hours = now.getHours() - start.getHours();
      let minutes = now.getMinutes() - start.getMinutes();
      let seconds = now.getSeconds() - start.getSeconds();

      // Adjust seconds
      if (seconds < 0) {
        seconds += 60;
        minutes--;
      }
      // Adjust minutes
      if (minutes < 0) {
        minutes += 60;
        hours--;
      }
      // Adjust hours
      if (hours < 0) {
        hours += 24;
        days--;
      }
      // Adjust days (take account of month length)
      if (days < 0) {
        // Find previous month's final date
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
        months--;
      }
      // Adjust months
      if (months < 0) {
        months += 12;
        years--;
      }

      setTimeDiff({ years, months, days, hours, minutes, seconds });
    };

    calculateDifference();
    const interval = setInterval(calculateDifference, 1000);

    return () => clearInterval(interval);
  }, [startDateStr]);

  const cards = [
    { label: "anos", value: timeDiff.years, color: "from-cyan-400 to-cyan-500 shadow-cyan-500/10" },
    { label: "meses", value: timeDiff.months, color: "from-purple-400 to-purple-500 shadow-purple-500/10" },
    { label: "dias", value: timeDiff.days, color: "from-cyan-400 to-cyan-500 shadow-cyan-500/10" },
    { label: "horas", value: timeDiff.hours, color: "from-purple-400 to-purple-500 shadow-purple-500/10" },
    { label: "minutos", value: timeDiff.minutes, color: "from-cyan-400 to-cyan-500 shadow-cyan-500/10" },
    { label: "segundos", value: timeDiff.seconds, color: "from-purple-400 to-purple-500 shadow-purple-500/10" },
  ];

  return (
    <div
      id="chronometer-outer-container"
      className="w-full max-w-lg mx-auto bg-black/50 border border-cyan-500/20 rounded-2xl p-6 text-center relative overflow-hidden backdrop-blur-md"
    >
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_8px_rgba(0,210,255,1)]" />

      <h5 className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold mb-3">
        Eu te amo há:
      </h5>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mt-4">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`flex flex-col bg-slate-950/70 border border-slate-900 rounded-xl py-3 px-1 shadow-[0_4px_12px_rgba(0,0,0,0.5)] relative overflow-hidden`}
          >
            {/* Ambient lighting inside digits */}
            <div className={`absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r ${card.color}`} />

            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white bg-gradient-to-b from-white to-gray-400 bg-clip-text text-transparent">
              {String(card.value).padStart(2, "0")}
            </span>
            <span className="text-[9px] font-mono font-bold uppercase text-gray-500 mt-1 tracking-wider">
              {card.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
