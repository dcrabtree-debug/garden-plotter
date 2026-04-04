const fs = require('fs');
const companions = JSON.parse(fs.readFileSync('/Users/davidcrabtree/garden-plotter/data/companions.json', 'utf8'));
const plants = JSON.parse(fs.readFileSync('/Users/davidcrabtree/garden-plotter/data/plants.json', 'utf8'));
const validSlugs = new Set(plants.map(p => p.slug));

// Build set of existing pairs to avoid duplicates
const existingPairs = new Set();
for (const c of companions) {
  existingPairs.add(`${c.plantA}|${c.plantB}|${c.relationship}`);
  existingPairs.add(`${c.plantB}|${c.plantA}|${c.relationship}`);
}

const newEntries = [
  // CARROT companions
  { plantA: "carrot", plantB: "onion-sets", relationship: "friend", reason: "Onion scent deters carrot fly, the main carrot pest", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "carrot", plantB: "spring-onion", relationship: "friend", reason: "Allium scent masks carrot foliage from carrot fly", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "carrot", plantB: "rosemary", relationship: "friend", reason: "Rosemary scent deters carrot fly", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "carrot", plantB: "leek", relationship: "friend", reason: "Leeks deter carrot fly while carrots deter leek moth", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "carrot", plantB: "pea", relationship: "friend", reason: "Peas fix nitrogen benefiting carrots; different root depths", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "carrot", plantB: "dill", relationship: "foe", reason: "Dill can cross-pollinate with carrots (same family Apiaceae), reducing seed quality", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // ONION-SETS companions
  { plantA: "onion-sets", plantB: "carrot", relationship: "friend", reason: "Classic companion — onion scent deters carrot fly", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "onion-sets", plantB: "lettuce", relationship: "friend", reason: "Allium scent deters aphids from lettuce", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "onion-sets", plantB: "broad-bean", relationship: "foe", reason: "Alliums inhibit legume growth", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "onion-sets", plantB: "pea", relationship: "foe", reason: "Alliums inhibit legume growth through root exudates", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // GARLIC companions
  { plantA: "garlic", plantB: "strawberry-everbearing", relationship: "friend", reason: "Garlic deters aphids and spider mites from strawberries", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "garlic", plantB: "carrot", relationship: "friend", reason: "Garlic scent deters carrot fly", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "garlic", plantB: "dwarf-french-bean", relationship: "foe", reason: "Alliums inhibit bean growth through root exudates", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "garlic", plantB: "pea", relationship: "foe", reason: "Alliums inhibit legume growth", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // BEETROOT companions
  { plantA: "beetroot", plantB: "lettuce", relationship: "friend", reason: "Lettuce acts as living mulch conserving moisture for beetroot", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "beetroot", plantB: "onion-sets", relationship: "friend", reason: "Onion scent deters pests; shallow onion roots don't compete with deeper beet roots", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "beetroot", plantB: "runner-bean", relationship: "foe", reason: "Runner beans can shade and outcompete beetroot", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // CABBAGE companions
  { plantA: "cabbage", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums act as trap crop drawing cabbage white caterpillars away", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "cabbage", plantB: "sage", relationship: "friend", reason: "Sage scent deters cabbage moth and cabbage white butterfly", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "cabbage", plantB: "strawberry-everbearing", relationship: "foe", reason: "Brassicas and strawberries compete for nutrients and inhibit each other's growth", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // BRUSSELS SPROUTS companions
  { plantA: "brussels-sprouts", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums trap aphids and caterpillars away from sprouts", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "brussels-sprouts", plantB: "sage", relationship: "friend", reason: "Sage deters cabbage moth from brassicas", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "brussels-sprouts", plantB: "strawberry-everbearing", relationship: "foe", reason: "Brassicas inhibit strawberry growth", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // BROCCOLI-SPROUTING companions
  { plantA: "broccoli-sprouting", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums trap aphids away from broccoli", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "broccoli-sprouting", plantB: "sage", relationship: "friend", reason: "Sage deters cabbage moth from brassicas", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "broccoli-sprouting", plantB: "strawberry-everbearing", relationship: "foe", reason: "Brassicas and strawberries inhibit each other", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // CAULIFLOWER companions
  { plantA: "cauliflower", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums trap pests away from cauliflower", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "cauliflower", plantB: "sage", relationship: "friend", reason: "Sage scent deters cabbage white butterfly", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "cauliflower", plantB: "strawberry-everbearing", relationship: "foe", reason: "Brassicas and strawberries are mutually inhibitory", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // PEA companions
  { plantA: "pea", plantB: "carrot", relationship: "friend", reason: "Peas fix nitrogen benefiting carrots; different root depths avoid competition", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "pea", plantB: "radish", relationship: "friend", reason: "Radishes are harvested before peas need the space; peas fix nitrogen", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "pea", plantB: "garlic", relationship: "foe", reason: "Alliums inhibit legume growth through root exudates", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "pea", plantB: "onion-sets", relationship: "foe", reason: "Alliums inhibit legume growth", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // BROAD BEAN companions
  { plantA: "broad-bean", plantB: "carrot", relationship: "friend", reason: "Beans fix nitrogen benefiting carrots", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "broad-bean", plantB: "lettuce", relationship: "friend", reason: "Lettuce grows as living mulch under taller bean plants", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "broad-bean", plantB: "garlic", relationship: "foe", reason: "Alliums inhibit legume growth", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // RUNNER BEAN companions
  { plantA: "runner-bean", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums trap aphids away from runner beans", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "runner-bean", plantB: "sweetcorn", relationship: "friend", reason: "Sweetcorn provides natural climbing support for beans (Three Sisters)", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "runner-bean", plantB: "chives", relationship: "foe", reason: "Alliums inhibit legume growth", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // SWEETCORN companions (Three Sisters)
  { plantA: "sweetcorn", plantB: "runner-bean", relationship: "friend", reason: "Classic Three Sisters — corn supports beans, beans fix nitrogen", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "sweetcorn", plantB: "squash", relationship: "friend", reason: "Three Sisters — squash shades soil reducing weeds and moisture loss", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "sweetcorn", plantB: "pea", relationship: "friend", reason: "Peas fix nitrogen benefiting heavy-feeding sweetcorn", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // SQUASH companions
  { plantA: "squash", plantB: "sweetcorn", relationship: "friend", reason: "Three Sisters — squash leaves shade soil suppressing weeds", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "squash", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums deter squash bugs", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "squash", plantB: "potato-early", relationship: "foe", reason: "Both heavy feeders competing for soil nutrients in same space", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // ASPARAGUS companions
  { plantA: "asparagus", plantB: "tomato-tumbling", relationship: "friend", reason: "Tomatoes repel asparagus beetle; asparagus repels root-knot nematodes", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "asparagus", plantB: "parsley", relationship: "friend", reason: "Parsley attracts beneficial hoverflies to asparagus beds", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "asparagus", plantB: "garlic", relationship: "foe", reason: "Alliums compete for similar root space with asparagus crowns", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // ROSEMARY companions
  { plantA: "rosemary", plantB: "carrot", relationship: "friend", reason: "Rosemary scent deters carrot fly", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "rosemary", plantB: "cabbage", relationship: "friend", reason: "Rosemary deters cabbage moth and cabbage looper", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "rosemary", plantB: "sage", relationship: "friend", reason: "Mediterranean herbs with identical growing requirements", source: "https://www.rhs.org.uk/herbs" },

  // SAGE companions
  { plantA: "sage", plantB: "cabbage", relationship: "friend", reason: "Sage deters cabbage moth and cabbage white butterfly from brassicas", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "sage", plantB: "carrot", relationship: "friend", reason: "Sage scent masks carrot foliage from carrot fly", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "sage", plantB: "rosemary", relationship: "friend", reason: "Both Mediterranean herbs thriving in same poor, well-drained soil", source: "https://www.rhs.org.uk/herbs" },

  // LAVENDER companions
  { plantA: "lavender", plantB: "rosemary", relationship: "friend", reason: "Both Mediterranean plants needing identical conditions — poor, well-drained, sunny", source: "https://www.rhs.org.uk/herbs" },
  { plantA: "lavender", plantB: "sage", relationship: "friend", reason: "Similar Mediterranean growing requirements; both attract pollinators", source: "https://www.rhs.org.uk/herbs" },
  { plantA: "lavender", plantB: "thyme", relationship: "friend", reason: "All thrive in well-drained poor soil; attract beneficial insects", source: "https://www.rhs.org.uk/herbs" },

  // CORIANDER companions
  { plantA: "coriander", plantB: "lettuce", relationship: "friend", reason: "Both enjoy partial shade; coriander attracts beneficial insects", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "coriander", plantB: "tomato-tumbling", relationship: "friend", reason: "Coriander attracts hoverflies that eat tomato pests", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "coriander", plantB: "fennel", relationship: "foe", reason: "Cross-pollination between Apiaceae family members", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // CELERY companions
  { plantA: "celery", plantB: "lettuce", relationship: "friend", reason: "Similar moisture needs; lettuce provides ground cover", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "celery", plantB: "dwarf-french-bean", relationship: "friend", reason: "Beans fix nitrogen benefiting heavy-feeding celery", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "celery", plantB: "parsnip", relationship: "foe", reason: "Both Apiaceae family — share celery fly and other pests", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // LEEK companions
  { plantA: "leek", plantB: "carrot", relationship: "friend", reason: "Leeks deter carrot fly while carrots deter leek moth — classic pairing", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "leek", plantB: "celery", relationship: "friend", reason: "Celery scent helps mask leek foliage from leek moth", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "leek", plantB: "broad-bean", relationship: "foe", reason: "Alliums inhibit legume growth through root exudates", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // PARSNIP companions
  { plantA: "parsnip", plantB: "onion-sets", relationship: "friend", reason: "Onion scent deters carrot fly which also attacks parsnips (same family)", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "parsnip", plantB: "radish", relationship: "friend", reason: "Quick radishes mark slow-germinating parsnip rows", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "parsnip", plantB: "celery", relationship: "foe", reason: "Both Apiaceae family sharing celery fly and pests", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // TURNIP companions
  { plantA: "turnip", plantB: "pea", relationship: "friend", reason: "Peas fix nitrogen benefiting turnips; harvested at different times", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "turnip", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums trap flea beetle and caterpillars away from turnips", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "turnip", plantB: "potato-early", relationship: "foe", reason: "Both root crops competing for the same soil space and nutrients", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // POTATO-EARLY companions (tomato foe already exists)
  { plantA: "potato-early", plantB: "broad-bean", relationship: "friend", reason: "Broad beans fix nitrogen and deter Colorado beetle", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "potato-early", plantB: "marigold", relationship: "friend", reason: "Marigold roots deter soil nematodes around potato plants", source: "https://www.rhs.org.uk/companion-planting" },

  // POTATO-MAINCROP companions (tomato foe already exists)
  { plantA: "potato-maincrop", plantB: "broad-bean", relationship: "friend", reason: "Broad beans fix nitrogen benefiting potatoes", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "potato-maincrop", plantB: "marigold", relationship: "friend", reason: "Marigold roots deter soil nematodes around potato plants", source: "https://www.rhs.org.uk/companion-planting" },

  // RASPBERRY companions
  { plantA: "raspberry", plantB: "garlic", relationship: "friend", reason: "Garlic deters aphids which spread raspberry viruses", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "raspberry", plantB: "marigold", relationship: "friend", reason: "Marigolds attract pollinators and deter soil nematodes", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "raspberry", plantB: "potato-early", relationship: "foe", reason: "Potatoes can spread verticillium wilt to raspberries", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // BLACKBERRY companions
  { plantA: "blackberry", plantB: "garlic", relationship: "friend", reason: "Garlic deters aphids from blackberry canes", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "blackberry", plantB: "borage", relationship: "friend", reason: "Borage attracts pollinators improving blackberry fruit set", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // BLUEBERRY companions
  { plantA: "blueberry", plantB: "strawberry-everbearing", relationship: "friend", reason: "Both prefer acid soil conditions; different heights avoid competition", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "blueberry", plantB: "borage", relationship: "friend", reason: "Borage attracts pollinators improving blueberry fruit set", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // GOOSEBERRY companions
  { plantA: "gooseberry", plantB: "garlic", relationship: "friend", reason: "Garlic deters aphids from gooseberry bushes", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "gooseberry", plantB: "marigold", relationship: "friend", reason: "Marigolds attract beneficial insects and deter pests", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // BLACKCURRANT companions
  { plantA: "blackcurrant", plantB: "garlic", relationship: "friend", reason: "Garlic deters aphids which are vectors for reversion virus", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "blackcurrant", plantB: "borage", relationship: "friend", reason: "Borage attracts pollinators improving currant yield", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // REDCURRANT companions
  { plantA: "redcurrant", plantB: "garlic", relationship: "friend", reason: "Garlic deters aphids from currant bushes", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "redcurrant", plantB: "borage", relationship: "friend", reason: "Borage attracts pollinators for better fruit set", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // APPLE-DWARF companions
  { plantA: "apple-dwarf", plantB: "chives", relationship: "friend", reason: "Chives deter apple scab and aphids from apple trees", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "apple-dwarf", plantB: "nasturtium", relationship: "friend", reason: "Nasturtiums act as trap crop for woolly aphid on apples", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "apple-dwarf", plantB: "garlic", relationship: "friend", reason: "Garlic deters apple borers and aphids", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // AUBERGINE companions
  { plantA: "aubergine", plantB: "basil-sweet", relationship: "friend", reason: "Basil repels aphids and whitefly from aubergines (same family as tomatoes)", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "aubergine", plantB: "marigold", relationship: "friend", reason: "Marigolds deter whitefly and attract pollinators", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "aubergine", plantB: "fennel", relationship: "foe", reason: "Fennel is allelopathically inhibitory to most vegetables including aubergines", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // BAY LAUREL companions
  { plantA: "bay-laurel", plantB: "rosemary", relationship: "friend", reason: "Both Mediterranean plants with similar sunny, sheltered growing conditions", source: "https://www.rhs.org.uk/herbs" },
  { plantA: "bay-laurel", plantB: "lavender", relationship: "friend", reason: "Both enjoy full sun and well-drained soil; complement garden structure", source: "https://www.rhs.org.uk/herbs" },

  // RHUBARB companions (largely isolated)
  { plantA: "rhubarb", plantB: "garlic", relationship: "friend", reason: "Garlic deters crown rot and aphids around rhubarb", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "rhubarb", plantB: "borage", relationship: "friend", reason: "Borage attracts pollinators; deep-rooted plants coexist at different levels", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // FIG companions
  { plantA: "fig", plantB: "lavender", relationship: "friend", reason: "Both Mediterranean plants thriving in similar warm, well-drained conditions", source: "https://www.rhs.org.uk/herbs" },
  { plantA: "fig", plantB: "rosemary", relationship: "friend", reason: "Mediterranean companions with compatible growing needs", source: "https://www.rhs.org.uk/herbs" },

  // CALENDULA companions
  { plantA: "calendula", plantB: "tomato-tumbling", relationship: "friend", reason: "Calendula attracts hoverflies that eat tomato pests", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "calendula", plantB: "lettuce", relationship: "friend", reason: "Calendula attracts beneficial insects and pollinators near salads", source: "https://www.rhs.org.uk/companion-planting" },

  // SUNFLOWER companions
  { plantA: "sunflower", plantB: "sweetcorn", relationship: "friend", reason: "Both tall sun-lovers; sunflowers attract pollinators benefiting nearby crops", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "sunflower", plantB: "lettuce", relationship: "friend", reason: "Sunflowers provide welcome afternoon shade for heat-sensitive lettuce", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "sunflower", plantB: "potato-early", relationship: "foe", reason: "Sunflowers are allelopathic — root exudates inhibit potato tuber development", source: "https://extension.wvu.edu/lawn-gardening-pests/gardening/garden-management/companion-planting" },

  // CORNFLOWER companions
  { plantA: "cornflower", plantB: "calendula", relationship: "friend", reason: "Both attract pollinators and beneficial insects to the garden", source: "https://www.rhs.org.uk/companion-planting" },
  { plantA: "cornflower", plantB: "lettuce", relationship: "friend", reason: "Cornflowers attract hoverflies that eat lettuce aphids", source: "https://www.rhs.org.uk/companion-planting" },

  // DWARF SWEET PEA companions
  { plantA: "dwarf-sweet-pea", plantB: "lettuce", relationship: "friend", reason: "Sweet peas fix nitrogen benefiting lettuce; flowers attract pollinators", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },
  { plantA: "dwarf-sweet-pea", plantB: "chives", relationship: "foe", reason: "Alliums can inhibit legume family growth", source: "https://extension.umn.edu/planting-and-growing-guides/companion-planting-home-gardens" },

  // SWISS CHARD additional companions (already has some)
  { plantA: "swiss-chard", plantB: "onion-sets", relationship: "friend", reason: "Onion scent deters leaf miner from chard", source: "https://www.rhs.org.uk/companion-planting" },
];

// Filter out duplicates and validate slugs
let added = 0;
let skippedDupe = 0;
let skippedInvalid = 0;
for (const entry of newEntries) {
  const key = `${entry.plantA}|${entry.plantB}|${entry.relationship}`;
  const reverseKey = `${entry.plantB}|${entry.plantA}|${entry.relationship}`;
  if (existingPairs.has(key) || existingPairs.has(reverseKey)) {
    skippedDupe++;
    continue;
  }
  if (!validSlugs.has(entry.plantA) || !validSlugs.has(entry.plantB)) {
    console.log('INVALID SLUG:', entry.plantA, entry.plantB);
    skippedInvalid++;
    continue;
  }
  companions.push(entry);
  existingPairs.add(key);
  existingPairs.add(reverseKey);
  added++;
}

console.log('Added:', added, 'new companion entries');
console.log('Skipped (duplicate):', skippedDupe);
console.log('Skipped (invalid slug):', skippedInvalid);
console.log('Total companions now:', companions.length);

// Check which of the 40 orphan plants still have zero entries
const orphanSlugs = ['apple-dwarf','asparagus','aubergine','bay-laurel','beetroot','blackberry','blackcurrant','blueberry','broad-bean','broccoli-sprouting','brussels-sprouts','cabbage','calendula','carrot','cauliflower','celery','coriander','cornflower','dwarf-sweet-pea','fig','garlic','gooseberry','lavender','leek','onion-sets','parsnip','pea','potato-early','potato-maincrop','raspberry','redcurrant','rhubarb','rosemary','runner-bean','sage','squash','sunflower','sweetcorn','swiss-chard','turnip'];

const allSlugsInCompanions = new Set();
for (const c of companions) {
  allSlugsInCompanions.add(c.plantA);
  allSlugsInCompanions.add(c.plantB);
}

const stillOrphan = orphanSlugs.filter(s => !allSlugsInCompanions.has(s));
if (stillOrphan.length > 0) {
  console.log('STILL ORPHAN:', stillOrphan.join(', '));
} else {
  console.log('All 40 orphan plants now have companion data!');
}

fs.writeFileSync('/Users/davidcrabtree/garden-plotter/data/companions.json', JSON.stringify(companions, null, 2) + '\n');
console.log('Written to data/companions.json');

fs.copyFileSync('/Users/davidcrabtree/garden-plotter/data/companions.json', '/Users/davidcrabtree/garden-plotter/public/data/companions.json');
console.log('Copied to public/data/companions.json');
