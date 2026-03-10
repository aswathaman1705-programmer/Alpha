CITY_ANALYSIS_DATA = {
    "Chennai": {
        "causes": [
            ("🚗 Traffic Congestion", 38, "4M+ vehicles. NH-48 and OMR corridors see 2-hr gridlocks emitting NO₂ and CO."),
            ("🏭 Industrial Corridor (SIDCO)", 28, "Ambattur/Manali estates house 1200+ units releasing PM2.5, SO₂ and VOCs."),
            ("🌊 Sea-Salt Aerosols", 18, "Coastal winds carry salt particles that trap PM2.5."),
            ("🔥 Crop Burning", 10, "Oct–Nov rice stubble burning in Kancheepuram spikes particulates."),
            ("🏗️ Construction Dust", 6, "50+ metro and expressway sites raise PM10 year-round."),
        ],
        "solutions": [
            "🚇 Accelerate Phase 2 metro to cut 200K daily car trips",
            "🌿 Mandatory green buffer zones around SIDCO estates",
            "⚡ EV incentive zones on OMR and ECR corridors",
            "🌧️ Mechanized road sweeping during dry seasons",
            "🌾 Subsidize happy-seeder machines to end crop burning",
            "🏭 CPCB real-time stack emission monitors for all 1200 units",
        ],
        "best_month": "February", "worst_month": "November",
        "good_facts": [
            "🌊 Chennai's sea breeze naturally clears pollution on good days",
            "🌳 Guindy National Park acts as a natural air filter in the heart of the city",
            "☀️ High UV index breaks down ground-level ozone faster than inland cities",
        ]
    },
    "Delhi": {
        "causes": [
            ("🔥 Stubble Burning", 42, "Oct–Nov burning of 20M tons of rice stubble creates a toxic blanket. AQI crosses 500."),
            ("🚗 13M Vehicles + Dust", 30, "World's highest vehicle density. BS-IV diesel trucks are a major PM2.5 source."),
            ("🏭 Coal Power Plants (NCR)", 15, "Dadri and Jhajjar plants emit SO₂ and fly ash worsening winter inversions."),
            ("🌡️ Temperature Inversion", 10, "Cold air traps pollutants below 200m in Oct–Feb."),
            ("🏗️ Construction Boom", 3, "Expressway and housing projects add 300 tons/day of construction dust."),
        ],
        "solutions": [
            "🚫 Satellite-tracked crop burning fines in real time",
            "🚌 Double CNG bus fleet — replace 5000 diesel buses",
            "⛽ Retire coal plants — shift NCR to solar by 2030",
            "🌳 Plant 50M trees in NCR greenbelt as pollution sinks",
            "🔄 Odd-even vehicle rationing during AQI > 300 days",
            "💨 Industrial emission trading scheme — cap and reduce",
        ],
        "best_month": "July", "worst_month": "November",
        "good_facts": [
            "🌧️ Delhi monsoons (Jul–Aug) wash out 70% of PM2.5 naturally",
            "🌬️ Western disturbances bring fresh winds that briefly clear the air",
            "🌳 The Ridge Forest is one of India's largest urban forests acting as a lung",
        ]
    },
    "Mumbai": {
        "causes": [
            ("🚗 8M Vehicles on Peninsula", 35, "Mumbai's geography traps pollution. Western Express Highway sees 500K+ vehicles/day."),
            ("🏭 Petrochemical Belt (Trombay)", 30, "BPCL, HPCL refineries in Chembur emit SO₂ and H₂S continuously."),
            ("🚢 Port & Shipping Emissions", 15, "JNPT burns bunker fuel with 2500x higher sulfur than road diesel."),
            ("🏗️ Coastal Road + Metro Projects", 12, "8 simultaneous megaprojects raise PM10 city-wide."),
            ("🌊 Sea Breeze Trapping", 8, "Evening sea breezes push pollutants inland and trap them overnight."),
        ],
        "solutions": [
            "⚓ Shore power for ships at JNPT — eliminate engine idling",
            "🏭 Chembur clean-air zone — retrofit or relocate refineries",
            "🚇 Fast-track metro lines 2A, 7 to cut car dependency",
            "🌿 Urban forest canopy target: 25% of Mumbai's area",
            "🚲 Last-mile cycling infra to reduce short trips",
            "📡 Real-time AQI sensors in all 24 wards",
        ],
        "best_month": "June", "worst_month": "December",
        "good_facts": [
            "🌊 Mumbai's sea breeze is one of the strongest among Indian metros — a natural air cleaner",
            "🌧️ 2500mm annual rainfall washes particulates from the atmosphere",
            "🌴 Aarey Colony and Sanjay Gandhi National Park are massive green lungs",
        ]
    },
    "Bangalore": {
        "causes": [
            ("🚗 Rapid IT Corridor Traffic", 40, "Outer Ring Road and Whitefield corridors see extreme congestion from 8M+ vehicles."),
            ("🏗️ Uncontrolled Urbanization", 30, "Bangalore is the fastest-growing city in India — construction dust is a year-round issue."),
            ("🌡️ Reduced Lake Area", 15, "200+ lakes destroyed since 1960s, reducing humidity and natural particulate settling."),
            ("🏭 Industrial Areas (Peenya)", 10, "Peenya KIADB estate hosts heavy engineering units with limited emission controls."),
            ("🔥 Garbage Burning", 5, "Open waste burning in peripheral wards releases toxic PM2.5 and dioxins."),
        ],
        "solutions": [
            "🚇 Namma Metro Phase 3 completion to cut car trips by 30%",
            "💧 Restore 50 Bangalore lakes to improve humidity and air quality",
            "🏗️ Mandatory dust barriers and water sprinklers on all construction sites",
            "🌳 Urban canopy cover target: 33% of the city",
            "🚫 Zero open burning — community biogas units for organic waste",
            "⚡ EV-only zones in CBD and Koramangala",
        ],
        "best_month": "January", "worst_month": "October",
        "good_facts": [
            "🌳 Cubbon Park and Lalbagh are world-class urban green spaces that filter city air",
            "🌡️ Bangalore's altitude (920m) means lower atmospheric pressure naturally disperses pollutants",
            "🌧️ Two monsoon seasons annually give Bangalore more natural air-washing than most cities",
        ]
    },
}

DEFAULT_ANALYSIS = {
    "causes": [
        ("🚗 Vehicular Emissions", 40, "High vehicle density and aging fleet contribute to NO₂ and PM2.5."),
        ("🏭 Industrial Activity", 30, "Manufacturing units in peri-urban areas release SO₂ and particulates."),
        ("🔥 Biomass Burning", 15, "Agricultural and waste burning spikes PM2.5 seasonally."),
        ("🏗️ Construction Dust", 10, "Urban expansion raises PM10 throughout the year."),
        ("🌡️ Weather Trapping", 5, "Inversions and low winds trap pollutants on calm days."),
    ],
    "solutions": [
        "⚡ Accelerate EV adoption through subsidies",
        "🌿 Green buffer zones around industrial areas",
        "🚇 Expand public transit coverage",
        "🌳 City-wide urban greening drives",
        "📡 Dense real-time AQI sensor network",
        "🏭 Stack emission monitors for all industrial units",
    ],
    "best_month": "February", "worst_month": "November",
    "good_facts": [
        "🌿 This city has significant green cover that naturally filters the air",
        "🌬️ Prevailing winds help disperse pollutants on most days",
        "☀️ Sunlight helps break down secondary pollutants naturally",
    ]
}
