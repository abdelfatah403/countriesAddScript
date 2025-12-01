import { State } from 'country-state-city';
import dotenv from 'dotenv';
import { createRequire } from 'module';
import mongoose from 'mongoose';
import countries from 'world-countries';
import Country from './src/Db/models/countires.model.js';

const require = createRequire(import.meta.url);
const flags = require('country-flag-emoji-json');

dotenv.config();

const middleEasternCountries = [
    'AE', // United Arab Emirates
    'SA', // Saudi Arabia
    'EG', // Egypt
    'IQ', // Iraq
    'IR', // Iran
    'JO', // Jordan
    'KW', // Kuwait
    'LB', // Lebanon
    'OM', // Oman
    'QA', // Qatar
    'SY', // Syria
    'YE', // Yemen
    'BH', // Bahrain
    'PS', // Palestine
    'LY', // Libya
    'SD', // Sudan
    'TN', // Tunisia
    'DZ', // Algeria
    'MA', // Morocco
];

const seedCountries = async () => {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');

        await mongoose.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
        });
        console.log('✅ MongoDB connected');

        // Clear existing countries
        await Country.deleteMany({});
        console.log('🗑️  Cleared existing countries');

        // Create a map of flags by country code
        const flagMap = {};
        flags.forEach(flag => {
            flagMap[flag.code] = flag.emoji;
        });

        // Transform countries data
        const countryData = countries.map(country => {
            const iso2 = country.cca2;
            const iso3 = country.cca3;

            // Get flag emoji
            const flag = flagMap[iso2] || '';

            // Get translated names
            const names = {
                en: country.name.common,
                fr: country.translations?.fra?.common || country.name.common,
                gr: country.translations?.deu?.common || country.name.common,
                rs: country.translations?.rus?.common || country.name.common,
                ar: country.translations?.ara?.common || country.name.common,
            };

            // Check if Middle Eastern
            const middleEastern = middleEasternCountries.includes(iso2);

            // Get states/provinces for this country
            const countryStates = State.getStatesOfCountry(iso2);
            const states = countryStates.map(state => ({
                name: state.name,
            }));

            return {
                iso2,
                iso3,
                names,
                middleEastern,
                flag,
                states,
            };
        });

        // Insert all countries
        const result = await Country.insertMany(countryData);
        console.log(`✅ Successfully inserted ${result.length} countries`);

        // Show some stats
        const middleEastCount = result.filter(c => c.middleEastern).length;
        const totalStates = result.reduce((sum, c) => sum + c.states.length, 0);
        console.log(`📊 Middle Eastern countries: ${middleEastCount}`);
        console.log(`📊 Other countries: ${result.length - middleEastCount}`);
        console.log(`📊 Total states/provinces: ${totalStates}`);

        // Show some examples
        console.log('\n📋 Sample countries with states:');
        const samples = await Country.find({ middleEastern: true }).limit(5);
        samples.forEach(c => {
            console.log(
                `   ${c.flag} ${c.names.en} (${c.names.ar}) - ${c.iso2} | States: ${c.states.length}`
            );
            if (c.states.length > 0) {
                const stateNames = c.states
                    .slice(0, 3)
                    .map(s => s.name)
                    .join(', ');
                console.log(`      → ${stateNames}${c.states.length > 3 ? '...' : ''}`);
            }
        });

        console.log('\n✅ Script completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding countries:', error);
        process.exit(1);
    }
};

seedCountries();
