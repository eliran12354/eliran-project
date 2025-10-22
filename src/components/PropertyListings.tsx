import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Calendar, Zap } from "lucide-react";

interface Property {
  id: number;
  title: string;
  location: string;
  image: string;
  score: number;
  type: string;
  status: 'new' | 'sale' | 'rent';
  expectedReturn: string;
  monthsToReturn: number;
  annualReturn: string;
  priceRange: string;
}

const properties: Property[] = [
  {
    id: 1,
    title: "מתחם מסחרי בירושלים",
    location: "מרכז העיר, ירושלים",
    image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop",
    score: 78,
    type: "מסחרי",
    status: "new",
    expectedReturn: "15%",
    monthsToReturn: 18,
    annualReturn: "₪1.8M",
    priceRange: "נמוך"
  },
  {
    id: 2,
    title: "קרקע לבנייה ברזיליה",
    location: "חזק הרב, אזור התעשייה",
    image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=400&h=250&fit=crop",
    score: 92,
    type: "קרקע",
    status: "sale",
    expectedReturn: "22%",
    monthsToReturn: 36,
    annualReturn: "₪4.2M",
    priceRange: "פיתוח קרקע"
  },
  {
    id: 3,
    title: "פרויקט פיני-בנייה תל אביב",
    location: "תל אביב, שכונת נווה צדק",
    image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=250&fit=crop",
    score: 85,
    type: "מגורים",
    status: "rent", 
    expectedReturn: "18%",
    monthsToReturn: 24,
    annualReturn: "₪2.5M",
    priceRange: "פיתוח בנייה"
  }
];

export function PropertyListings() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowRight className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-bold">צפה בכל הפרויקטים</h2>
        </div>
        <Button variant="outline" className="hover-lift shadow-soft">עוד פרויקטים</Button>
      </div>

      <p className="text-xl text-muted-foreground">
        כל מה שאתה צריך לקבלת החלטות השקעה חכמות
      </p>

      <div className="grid grid-cols-3 gap-8 animate-slide-up">
        {properties.map((property, index) => (
          <Card key={property.id} className="overflow-hidden hover-lift bg-gradient-card shadow-soft border-0 group" style={{animationDelay: `${index * 0.1}s`}}>
            <div className="relative overflow-hidden">
              <img 
                src={property.image} 
                alt={property.title}
                className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300"></div>
              <Badge 
                className={`absolute top-4 left-4 shadow-medium ${
                  property.score > 85 
                    ? "bg-gradient-primary text-white border-0" 
                    : "bg-white/90 text-primary border-0"
                }`}
              >
                צנץ {property.score}
              </Badge>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors duration-300">{property.title}</h3>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span className="font-medium">{property.location}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Badge 
                  variant={property.status === 'new' ? 'default' : 
                          property.status === 'sale' ? 'destructive' : 'secondary'}
                  className="text-xs font-medium shadow-soft"
                >
                  {property.status === 'new' ? 'נמוך' : 
                   property.status === 'sale' ? 'נבחרה' : 'בניינית'}
                </Badge>
                <Badge variant="outline" className="text-xs font-medium">
                  {property.priceRange}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm">
                <div className="text-center p-3 bg-primary/5 rounded-xl">
                  <div className="font-medium text-muted-foreground mb-1">תשואה צפויה</div>
                  <div className="text-success font-bold text-lg">{property.expectedReturn}</div>
                </div>
                <div className="text-center p-3 bg-muted/50 rounded-xl">
                  <div className="font-medium text-muted-foreground mb-1">השקעה נדרשת</div>
                  <div className="font-bold text-lg">{property.annualReturn}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <Calendar className="w-4 h-4" />
                <span className="font-medium">לוח זמנים: {property.monthsToReturn} חודשים</span>
              </div>

              <Button className="w-full h-12 bg-gradient-primary shadow-glow hover:shadow-large transition-all duration-300 font-semibold">
                צפה בפרטים
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}