// Seeded curriculum templates. All are flagged is_draft = true: verify against
// the official specification before relying on them. Topics are deliberately
// granular enough to log a session against.

export type SeedTemplate = {
  key: string;
  subject: "Mathematics" | "Physics";
  name: string;
  board: string;
  level: string;
  sections: { code: string; name: string; topics: [string, string][] }[];
};

export const EDEXCEL_IGCSE_MATHS_A: SeedTemplate = {
  key: "igcse-maths-a",
  subject: "Mathematics",
  name: "Pearson Edexcel IGCSE Mathematics A (4MA1) — Higher",
  board: "Pearson Edexcel",
  level: "IGCSE",
  sections: [
    {
      code: "1",
      name: "Numbers and the number system",
      topics: [
        ["1.1", "Integers, factors, multiples and primes"],
        ["1.2", "Fractions"],
        ["1.3", "Decimals and recurring decimals"],
        ["1.4", "Powers and roots"],
        ["1.4a", "Laws of indices (including negative and fractional)"],
        ["1.4b", "Surds"],
        ["1.5", "Set language and notation"],
        ["1.6", "Percentages (including reverse and compound)"],
        ["1.7", "Ratio and proportion"],
        ["1.8", "Degree of accuracy and bounds"],
        ["1.9", "Standard form"],
        ["1.10", "Applying number (money, speed, density)"],
        ["1.11", "Electronic calculators"],
      ],
    },
    {
      code: "2",
      name: "Equations, formulae and identities",
      topics: [
        ["2.1", "Use of symbols"],
        ["2.2a", "Expanding brackets"],
        ["2.2b", "Factorising (including quadratics)"],
        ["2.2c", "Algebraic fractions"],
        ["2.3", "Expressions, formulae and changing the subject"],
        ["2.4", "Linear equations"],
        ["2.5", "Direct and inverse proportion"],
        ["2.6", "Simultaneous linear equations"],
        ["2.7a", "Quadratic equations by factorising"],
        ["2.7b", "Quadratic formula and completing the square"],
        ["2.7c", "Simultaneous equations (one linear, one quadratic)"],
        ["2.8", "Inequalities (linear and quadratic)"],
      ],
    },
    {
      code: "3",
      name: "Sequences, functions and graphs",
      topics: [
        ["3.1a", "Arithmetic sequences and the nth term"],
        ["3.1b", "Sum of an arithmetic series"],
        ["3.2", "Function notation, composite and inverse functions"],
        ["3.3a", "Straight-line graphs, gradient and intercept"],
        ["3.3b", "Graphs of quadratics, cubics and reciprocals"],
        ["3.3c", "Transformations of graphs"],
        ["3.3d", "Distance–time and speed–time graphs"],
        ["3.4a", "Differentiation of polynomials"],
        ["3.4b", "Gradients, turning points and kinematics"],
      ],
    },
    {
      code: "4",
      name: "Geometry and trigonometry",
      topics: [
        ["4.1", "Angles, lines and triangles"],
        ["4.2", "Polygons and interior/exterior angles"],
        ["4.3", "Symmetry"],
        ["4.4", "Measures and compound measures"],
        ["4.5", "Constructions and loci"],
        ["4.6", "Circle theorems"],
        ["4.7", "Geometrical reasoning and proof"],
        ["4.8a", "Pythagoras' theorem"],
        ["4.8b", "Trigonometry in right-angled triangles"],
        ["4.8c", "Sine rule, cosine rule and area of a triangle"],
        ["4.8d", "3D trigonometry"],
        ["4.9", "Mensuration of 2D shapes (arcs and sectors)"],
        ["4.10", "3D shapes, surface area and volume"],
        ["4.11", "Similarity, congruence and scale factors"],
      ],
    },
    {
      code: "5",
      name: "Vectors and transformation geometry",
      topics: [
        ["5.1", "Vectors and vector geometry"],
        ["5.2", "Transformations (reflection, rotation, translation, enlargement)"],
      ],
    },
    {
      code: "6",
      name: "Statistics and probability",
      topics: [
        ["6.1a", "Graphical representation of data (histograms, cumulative frequency)"],
        ["6.1b", "Scatter graphs and correlation"],
        ["6.2", "Statistical measures (mean, median, mode, quartiles)"],
        ["6.3a", "Probability of single and combined events"],
        ["6.3b", "Tree diagrams and conditional probability"],
      ],
    },
  ],
};

export const IB_MATHS_AI: SeedTemplate = {
  key: "ib-maths-ai",
  subject: "Mathematics",
  name: "IB Mathematics: Applications and Interpretation (SL/HL extract)",
  board: "IB",
  level: "IB DP",
  sections: [
    {
      code: "1",
      name: "Number and algebra",
      topics: [
        ["1.1", "Standard form and approximation"],
        ["1.2", "Arithmetic sequences and series"],
        ["1.3", "Geometric sequences and series"],
        ["1.4", "Financial mathematics (compound interest, annuities, amortisation)"],
        ["1.5", "Exponents and logarithms"],
        ["1.6", "Simple proof and approximation"],
      ],
    },
    {
      code: "2",
      name: "Functions",
      topics: [
        ["2.1", "Straight lines and gradients"],
        ["2.2", "Concept of a function, domain and range"],
        ["2.3", "Graphs of functions and key features"],
        ["2.4", "Linear models"],
        ["2.5", "Modelling with quadratic, exponential and cubic functions"],
        ["2.6", "Modelling skills and choosing a model"],
      ],
    },
    {
      code: "3",
      name: "Geometry and trigonometry",
      topics: [
        ["3.1", "Distance, midpoint, volume and surface area"],
        ["3.2", "Right-angled trigonometry and bearings"],
        ["3.3", "Sine and cosine rules, area of a triangle"],
        ["3.4", "Voronoi diagrams"],
      ],
    },
    {
      code: "4",
      name: "Statistics and probability",
      topics: [
        ["4.1", "Sampling and data collection"],
        ["4.2", "Presentation of data (histograms, box plots, cumulative frequency)"],
        ["4.3", "Measures of central tendency and dispersion"],
        ["4.4", "Linear correlation and regression"],
        ["4.5", "Probability rules and Venn diagrams"],
        ["4.6", "Conditional probability and tree diagrams"],
        ["4.7", "Discrete random variables and expected value"],
        ["4.8", "Binomial and normal distributions"],
        ["4.9", "Hypothesis testing (chi-squared, t-test)"],
      ],
    },
    {
      code: "5",
      name: "Calculus",
      topics: [
        ["5.1", "Limits and derivatives"],
        ["5.2", "Differentiation of polynomials"],
        ["5.3", "Tangents, normals and turning points"],
        ["5.4", "Optimisation"],
        ["5.5", "Integration and area under a curve"],
      ],
    },
  ],
};

export const IB_MATHS_AA_HL: SeedTemplate = {
  key: "ib-maths-aa-hl",
  subject: "Mathematics",
  name: "IB Mathematics: Analysis and Approaches HL (extract)",
  board: "IB",
  level: "IB DP",
  sections: [
    {
      code: "1",
      name: "Number and algebra",
      topics: [
        ["1.1", "Arithmetic and geometric sequences and series"],
        ["1.2", "Exponents and logarithms"],
        ["1.3", "Binomial theorem"],
        ["1.4", "Proof (deduction, contradiction, induction)"],
        ["1.5", "Complex numbers"],
        ["1.6", "Partial fractions and systems of equations"],
      ],
    },
    {
      code: "2",
      name: "Functions",
      topics: [
        ["2.1", "Functions, composite and inverse"],
        ["2.2", "Quadratic functions and the discriminant"],
        ["2.3", "Rational and reciprocal functions"],
        ["2.4", "Transformations of graphs"],
        ["2.5", "Polynomials, factor and remainder theorems"],
        ["2.6", "Modulus functions and inequalities"],
      ],
    },
    {
      code: "3",
      name: "Geometry and trigonometry",
      topics: [
        ["3.1", "Radians, arcs and sectors"],
        ["3.2", "Trigonometric functions and identities"],
        ["3.3", "Trigonometric equations"],
        ["3.4", "Vectors: scalar and vector product"],
        ["3.5", "Lines and planes in 3D"],
      ],
    },
    {
      code: "4",
      name: "Statistics and probability",
      topics: [
        ["4.1", "Descriptive statistics"],
        ["4.2", "Probability and conditional probability"],
        ["4.3", "Discrete and continuous random variables"],
        ["4.4", "Binomial and normal distributions"],
        ["4.5", "Bayes' theorem"],
      ],
    },
    {
      code: "5",
      name: "Calculus",
      topics: [
        ["5.1", "Limits and continuity"],
        ["5.2", "Differentiation rules (chain, product, quotient)"],
        ["5.3", "Implicit differentiation and related rates"],
        ["5.4", "Integration techniques (substitution, by parts)"],
        ["5.5", "Differential equations"],
        ["5.6", "Maclaurin series"],
      ],
    },
  ],
};

export const SCHOOL_GRADE_8_9: SeedTemplate = {
  key: "school-g8-9",
  subject: "Mathematics",
  name: "School Mathematics — Grade 8/9 scheme of work",
  board: "School",
  level: "Grade 8/9",
  sections: [
    {
      code: "T1",
      name: "Term 1 — Number and algebra",
      topics: [
        ["T1.1", "Place value, rounding and estimation"],
        ["T1.2", "Fractions, decimals and percentages"],
        ["T1.3", "Law of Indices"],
        ["T1.4", "Standard form"],
        ["T1.5", "Expanding and factorising"],
        ["T1.6", "Solving linear equations"],
      ],
    },
    {
      code: "T2",
      name: "Term 2 — Geometry and measure",
      topics: [
        ["T2.1", "Angles in parallel lines and polygons"],
        ["T2.2", "Area and perimeter of compound shapes"],
        ["T2.3", "Circles: circumference and area"],
        ["T2.4", "Pythagoras' theorem"],
        ["T2.5", "Volume of prisms"],
      ],
    },
    {
      code: "T3",
      name: "Term 3 — Data and probability",
      topics: [
        ["T3.1", "Averages and range"],
        ["T3.2", "Charts and scatter graphs"],
        ["T3.3", "Probability of single events"],
        ["T3.4", "Sequences and the nth term"],
      ],
    },
  ],
};

export const EDEXCEL_IGCSE_PHYSICS: SeedTemplate = {
  key: "igcse-physics",
  subject: "Physics",
  name: "Pearson Edexcel IGCSE Physics (4PH1) — extract",
  board: "Pearson Edexcel",
  level: "IGCSE",
  sections: [
    {
      code: "1",
      name: "Forces and motion",
      topics: [
        ["1.1", "Units and measurement"],
        ["1.2", "Speed, velocity and acceleration"],
        ["1.3", "Distance–time and velocity–time graphs"],
        ["1.4", "Forces, Newton's laws and momentum"],
        ["1.5", "Stopping distance and terminal velocity"],
      ],
    },
    {
      code: "2",
      name: "Electricity",
      topics: [
        ["2.1", "Current, voltage and resistance"],
        ["2.2", "Series and parallel circuits"],
        ["2.3", "Electrical power and energy"],
      ],
    },
    {
      code: "3",
      name: "Waves",
      topics: [
        ["3.1", "Properties of waves"],
        ["3.2", "The electromagnetic spectrum"],
        ["3.3", "Reflection and refraction"],
      ],
    },
  ],
};

export const ALL_TEMPLATES = [EDEXCEL_IGCSE_MATHS_A, IB_MATHS_AI, IB_MATHS_AA_HL, SCHOOL_GRADE_8_9, EDEXCEL_IGCSE_PHYSICS];
