import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PersonalAccompanimentShell } from "@/components/PersonalAccompanimentShell";
import {
  isPersonalAccompanimentCheckoutConfigured,
  PERSONAL_ACCOMPANIMENT_CHECKOUT_URL,
  PERSONAL_ACCOMPANIMENT_PRICE_HEADING,
  PERSONAL_ACCOMPANIMENT_PRICE_LABEL,
} from "@/config/personalAccompaniment";

export default function PersonalAccompanimentCheckoutPage() {
  const checkoutReady = isPersonalAccompanimentCheckoutConfigured();

  return (
    <PersonalAccompanimentShell breadcrumbTail="תשלום">
      <header className="mb-8 text-center">
        <h1 className="text-2xl md:text-3xl font-bold font-display text-[#111318] mb-2">
          התחלת ליווי אישי
        </h1>
        <p className="text-slate-600">{PERSONAL_ACCOMPANIMENT_PRICE_HEADING}</p>
        <p className="text-3xl font-black font-display text-[#111318] mt-1 tabular-nums">
          {PERSONAL_ACCOMPANIMENT_PRICE_LABEL}
        </p>
      </header>

      <section
        className="rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/95 to-amber-50/40 p-6 md:p-8 shadow-sm"
        aria-labelledby="pay-heading"
      >
        <h2 id="pay-heading" className="sr-only">
          תשלום
        </h2>
        {!checkoutReady && (
          <p className="text-sm text-amber-950/85 text-center leading-relaxed mb-6">
            חיבור למערכת תשלומים יתווסף בקרוב. כרגע ניתן להמשיך לשלב פתיחת השיחה בוואטסאפ.
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-stretch sm:items-center">
          {checkoutReady ? (
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-bold rounded-xl shadow-md"
            >
              <a href={PERSONAL_ACCOMPANIMENT_CHECKOUT_URL} rel="noopener noreferrer">
                שלם והתחל
              </a>
            </Button>
          ) : (
            <Button
              asChild
              size="lg"
              className="h-14 px-10 text-lg font-bold rounded-xl shadow-md"
            >
              <Link to="/personal-accompaniment/welcome">שלם והתחל</Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-14 px-8 rounded-xl border-slate-300"
          >
            <Link to="/personal-accompaniment">חזרה להסבר</Link>
          </Button>
        </div>
      </section>
    </PersonalAccompanimentShell>
  );
}
