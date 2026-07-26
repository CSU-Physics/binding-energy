
// importing constant parameters
import { mass_of_proton, mass_of_neutron, mass_of_electron, conversion_amu_MeV, aV, aS, aC, aA, aP } from '../Functions/constants.js'

const BE_func = (Mx, Z, N) => {
    let bindnig_engergy = mass_defect_func(Mx, Z, N) * conversion_amu_MeV; // binding energy in MeV
    return [bindnig_engergy.toFixed(4)];
};

const mass_defect_func = (Mx, Z, N) => {
    let mass_defect = (mass_of_proton * Z) + (mass_of_neutron * N) + (mass_of_electron * Z) - Mx;
    return mass_defect;
}

const liquid_drop_model = (Z, N) => {
  if (!Number.isInteger(Z) || !Number.isInteger(N) || Z < 0 || N < 0) {
    throw new RangeError("Z and N must be non-negative integers.");
  }

  const A = Z + N;

  if (A === 0) {
    throw new RangeError("A = Z + N must be positive.");
  }

  const volumeTerm = aV * A;
  const surfaceTerm = -aS * A ** (2 / 3);
  const coulombTerm =
    -aC * Z * (Z - 1) / A ** (1 / 3);
  const asymmetryTerm =
    -aA * (A - 2 * Z) ** 2 / A;

  let pairingTerm = 0;

  if (Z % 2 === 0 && N % 2 === 0) {
    pairingTerm = aP / Math.sqrt(A);
  } else if (Z % 2 !== 0 && N % 2 !== 0) {
    pairingTerm = -aP / Math.sqrt(A);
  }

  return (
    volumeTerm +
    surfaceTerm +
    coulombTerm +
    asymmetryTerm +
    pairingTerm
  );
};


const elements = (symbol) => {
    switch (symbol) {
        case "H":
            return "Hydrogen";

        case "He":
            return "Helium";

        case "Li":
            return "Lithium";

        case "Be":
            return "Beryllium";

        case "B":
            return "Boron";

        case "C":
            return "Carbon";

        case "N":
            return "Notrogen";

        case "O":
            return "Oxygen";

        case "F":
            return "Fluorine";

        case "Ne":
            return "Neon";

        case "Na":
            return "Sodium";

        case "Mg":
            return "Magnesium";

        case "Al":
            return "Aluminium";

        case "Si":
            return "Silicon";

        case "P":
            return "Carbon";

        case "S":
            return "Sulfur";

        case "Cl":
            return "Chlorine";

        case "Ar":
            return "Argon";

        case "K":
            return "Potassium";

        case "Ca":
            return "Calcium";

        case "Sc":
            return "Scandium";

        case "Ti":
            return "Titanium";

        case "V":
            return "Vanadium";

        case "Cr":
            return "Chromium";

        case "Mn":
            return "Manganese";

        case "Fe":
            return "Iron";

        case "Co":
            return "Cobalt";

        case "Ni":
            return "Nikel";

        case "Cu":
            return "Copper";

        case "Zn":
            return "Zinc";

        case "Ga":
            return "Gallium";

        case "Ge":
            return "Germanium";

        case "As":
            return "Arsenic";

        case "Se":
            return "Selenium";

        case "Br":
            return "Bromine";

        case "Kr":
            return "Krypton";

        case "Rb":
            return "Rubidium";

        case "Sr":
            return "Strontium";

        case "Y":
            return "Yttrium";

        case "Zr":
            return "Zirconium";

        case "Nb":
            return "Niobium";

        case "Mo":
            return "Molybdenum";

        case "Tc":
            return "Technetium";

        case "Ru":
            return "Ruthenium";

        case "Rh":
            return "Rhodium";

        case "Pd":
            return "Palladium";

        case "Ag":
            return "Silver";

        case "Cd":
            return "Cadmium";

        case "In":
            return "Indium";

        case "Sn":
            return "Tin";

        case "Sb":
            return "Antimony";

        case "Te":
            return "Tellurium";

        case "I":
            return "Iodine";

        case "Xe":
            return "Xenon";

        case "Cs":
            return "Caesium";

        case "Ba":
            return "Barium";

        case "La":
            return "Lanthanum";

        case "Hf":
            return "Hafnium";

        case "Ta":
            return "Tantalum";

        case "W":
            return "Tungsten";

        case "Re":
            return "Rhenium";

        case "Os":
            return "Osmium";

        case "Ir":
            return "Iridium";

        case "Pt":
            return "Platinum";

        case "Au":
            return "Gold";

        case "Hg":
            return "Mercury";

        case "Tl":
            return "Thallium";

        case "Pb":
            return "Lead";

        case "Bi":
            return "Bismuth";

        case "Po":
            return "Polonium";

        case "At":
            return "Astatine";

        case "Rn":
            return "Radon";

        case "Fr":
            return "Francium";

        case "Ra":
            return "Radium";

        case "Ac":
            return "Actinium";

        case "Rf":
            return "Rutherfordium";

        case "Db":
            return "Dubnium";

        case "Sg":
            return "Seaborgium";

        case "Bh":
            return "Bohrium";

        case "Hs":
            return "Hassium";

        case "Mt":
            return "Meitnerium";

        case "Ds":
            return "Darmstadtium";

        case "Rg":
            return "Roentgenium";

        case "Cn":
            return "Copernicium";

        case "Nh":
            return "Nihonium";

        case "Fl":
            return "Flerovium";

        case "Mc":
            return "Moscovium";

        case "Lv":
            return "Livermorium";

        case "Ts":
            return "Tennessine";

        case "Og":
            return "Oganesson";

        case "Ce":
            return "Cerium";

        case "Pr":
            return "Praseodymium";

        case "Nd":
            return "Neodymium";

        case "Pm":
            return "Promethium";

        case "Sm":
            return "Samarium";

        case "Eu":
            return "Europium";

        case "Gd":
            return "Gadolinium";

        case "Tb":
            return "Terbium";

        case "Dy":
            return "Dysprosium";

        case "Ho":
            return "Holmium";

        case "Er":
            return "Erbium";

        case "Tm":
            return "Thulium";

        case "Yb":
            return "Ytterbium";

        case "Lu":
            return "Lutetium";

        case "Th":
            return "Thorium";

        case "Pa":
            return "Protactinium";

        case "U":
            return "Uranium";

        case "Np":
            return "Neptunium";

        case "Pu":
            return "Plutonium";

        case "Am":
            return "Americium";

        case "Cm":
            return "Curium";

        case "Bk":
            return "Berkelium";

        case "Cf":
            return "Californium";

        case "Es":
            return "Einsteinium";

        case "Fm":
            return "Fermium";

        case "Md":
            return "Mendelevium";

        case "No":
            return "Nobelium";

        case "Lr":
            return "Lawrencium";

        default:
            return "";
    }
}

const splitElementName = (str) => {
    let first = "";
    let second = "";
    const length = str.length;
    if (length % 2 === 0) {
        for (let i = 0; i < length / 2; i++) {
            first += str[i];
        }
        console.log(" ");
        for (let i = length / 2; i < length; i++) {
            second += str[i];
        }
    }
    else {
        for (let i = 0; i < (length - 1) / 2; i++) {
            first += str[i];
        }
        console.log(" ");
        for (let i = (length - 1) / 2; i < length; i++) {
            second += str[i];
        }
    }
    return [first, second];
};

export { liquid_drop_model, BE_func, elements, splitElementName, mass_defect_func};
