const fs = require('fs');
const plants = JSON.parse(fs.readFileSync('/Users/davidcrabtree/garden-plotter/data/plants.json', 'utf8'));

const inGroundData = {
  'strawberry-everbearing': { row: 40, rotation: 'any', bed: 'either', yield: '2-3 kg/m2', sowDepth: 0, feeding: 'Liquid feed fortnightly when fruiting', pests: ['slugs','aphids','vine weevil'], diseases: ['grey mould','powdery mildew'], problems: 'Bird damage to ripe fruit. Net with fine mesh.' },
  'tomato-tumbling': { row: 45, rotation: 'any', bed: 'either', yield: '3-5 kg/m2', sowDepth: 2, feeding: 'Liquid tomato feed weekly once first truss sets', pests: ['whitefly','aphids','tomato moth'], diseases: ['blight','blossom end rot'], problems: 'Blight in wet summers. Water consistently.' },
  'basil-sweet': { row: 25, rotation: 'any', bed: 'either', yield: '0.5-1 kg/m2', sowDepth: 0.5, feeding: 'Light liquid feed monthly', pests: ['aphids','slugs'], diseases: ['downy mildew'], problems: 'Frost tender. Do not plant out until June.' },
  'dwarf-french-bean': { row: 30, rotation: 'legumes', bed: 'either', yield: '2-3 kg/m2', sowDepth: 5, feeding: 'No additional feeding needed', pests: ['black bean aphid','slugs'], diseases: ['halo blight','rust'], problems: 'Slugs attack seedlings.' },
  'perpetual-spinach': { row: 30, rotation: 'roots-onions', bed: 'either', yield: '2-4 kg/m2', sowDepth: 2, feeding: 'Nitrogen-rich feed monthly', pests: ['aphids','leaf miner'], diseases: ['downy mildew'], problems: 'Bolts in hot dry weather.' },
  'swiss-chard': { row: 38, rotation: 'roots-onions', bed: 'either', yield: '2-4 kg/m2', sowDepth: 2.5, feeding: 'Nitrogen-rich feed monthly', pests: ['aphids','leaf miner','slugs'], diseases: ['downy mildew'], problems: 'Generally trouble-free.' },
  'thyme': { row: 30, rotation: 'permanent', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 0.5, feeding: 'No feeding needed', pests: ['few pests'], diseases: ['root rot in wet conditions'], problems: 'Replace every 3-4 years.' },
  'oregano': { row: 30, rotation: 'permanent', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 0.5, feeding: 'No feeding needed', pests: ['few pests'], diseases: ['root rot in wet conditions'], problems: 'Needs good drainage.' },
  'parsley': { row: 25, rotation: 'any', bed: 'either', yield: '0.5-1 kg/m2', sowDepth: 1, feeding: 'Light liquid feed monthly', pests: ['carrot fly','aphids'], diseases: ['leaf spot'], problems: 'Slow to germinate.' },
  'nasturtium': { row: 30, rotation: 'any', bed: 'either', yield: 'N/A companion plant', sowDepth: 2, feeding: 'No feeding', pests: ['blackfly (trap crop)','cabbage white caterpillars'], diseases: ['few diseases'], problems: 'Aphids expected as trap crop.' },
  'dwarf-sweet-pea': { row: 25, rotation: 'legumes', bed: 'either', yield: 'N/A ornamental', sowDepth: 3, feeding: 'Liquid feed fortnightly when flowering', pests: ['aphids','slugs','mice'], diseases: ['powdery mildew'], problems: 'Mice eat seeds.' },
  'lettuce': { row: 30, rotation: 'any', bed: 'either', yield: '2-4 kg/m2', sowDepth: 1, feeding: 'Light nitrogen feed every 2 weeks', pests: ['slugs','aphids','lettuce root aphid'], diseases: ['downy mildew','grey mould'], problems: 'Slugs main enemy.' },
  'chives': { row: 20, rotation: 'permanent', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 0.5, feeding: 'No feeding needed', pests: ['few pests'], diseases: ['rust'], problems: 'Cut back after flowering.' },
  'mint': { row: 30, rotation: 'permanent', bed: 'either', yield: '0.5-1 kg/m2', sowDepth: 0.5, feeding: 'Liquid feed monthly in containers', pests: ['few pests'], diseases: ['mint rust'], problems: 'Extremely invasive.' },
  'marigold': { row: 25, rotation: 'any', bed: 'either', yield: 'N/A companion plant', sowDepth: 1, feeding: 'No feeding needed', pests: ['slugs'], diseases: ['powdery mildew'], problems: 'Deadhead regularly.' },
  'radish': { row: 15, rotation: 'roots-onions', bed: 'either', yield: '2-3 kg/m2', sowDepth: 1, feeding: 'No additional feeding', pests: ['flea beetle','slugs'], diseases: ['few diseases'], problems: 'Flea beetle holes in leaves.' },
  'rocket': { row: 20, rotation: 'any', bed: 'either', yield: '1-2 kg/m2', sowDepth: 1, feeding: 'Light nitrogen feed monthly', pests: ['flea beetle','slugs'], diseases: ['downy mildew'], problems: 'Bolts in hot weather.' },
  'spring-onion': { row: 15, rotation: 'roots-onions', bed: 'either', yield: '1-2 kg/m2', sowDepth: 1, feeding: 'No additional feeding', pests: ['onion fly','thrips'], diseases: ['downy mildew','white rot'], problems: 'Avoid where alliums grew recently.' },
  'kale': { row: 45, rotation: 'brassicas', bed: 'either', yield: '2-4 kg/m2', sowDepth: 2, feeding: 'Nitrogen-rich feed every 3 weeks', pests: ['cabbage white caterpillars','aphids','pigeons'], diseases: ['clubroot','powdery mildew'], problems: 'Net against pigeons and butterflies.' },
  'pepper-chilli': { row: 45, rotation: 'any', bed: 'either', yield: '1-3 kg/m2', sowDepth: 1, feeding: 'Tomato feed weekly once fruiting', pests: ['aphids','whitefly','red spider mite'], diseases: ['blossom end rot'], problems: 'Needs maximum warmth.' },
  'runner-bean': { row: 60, rotation: 'legumes', bed: 'either', yield: '3-5 kg/m2', sowDepth: 5, feeding: 'No additional feeding', pests: ['black bean aphid','slugs','mice'], diseases: ['halo blight'], problems: 'Needs 2m cane support.' },
  'broad-bean': { row: 45, rotation: 'legumes', bed: 'either', yield: '2-3 kg/m2', sowDepth: 5, feeding: 'No additional feeding', pests: ['blackfly','chocolate spot','mice'], diseases: ['chocolate spot','rust'], problems: 'Pinch out tips when pods set.' },
  'pea': { row: 45, rotation: 'legumes', bed: 'either', yield: '1-2 kg/m2', sowDepth: 5, feeding: 'No additional feeding', pests: ['pea moth','mice','pigeons'], diseases: ['powdery mildew','pea wilt'], problems: 'Mice steal seeds.' },
  'courgette': { row: 90, rotation: 'any', bed: 'flat', yield: '4-8 kg/m2', sowDepth: 3, feeding: 'Liquid feed weekly when fruiting', pests: ['slugs','aphids'], diseases: ['powdery mildew','grey mould'], problems: 'Harvest at 15cm.' },
  'cucumber': { row: 60, rotation: 'any', bed: 'either', yield: '3-5 kg/m2', sowDepth: 2, feeding: 'Liquid feed weekly when fruiting', pests: ['whitefly','red spider mite','slugs'], diseases: ['powdery mildew','cucumber mosaic virus'], problems: 'Keep consistently moist.' },
  'beetroot': { row: 20, rotation: 'roots-onions', bed: 'either', yield: '3-5 kg/m2', sowDepth: 2.5, feeding: 'No additional feeding on fertile soil', pests: ['leaf miner','aphids'], diseases: ['few diseases'], problems: 'Soak seed clusters overnight.' },
  'carrot': { row: 15, rotation: 'roots-onions', bed: 'either', yield: '3-5 kg/m2', sowDepth: 1, feeding: 'No additional feeding', pests: ['carrot fly'], diseases: ['few diseases'], problems: 'Cover with fine mesh for carrot fly.' },
  'parsnip': { row: 30, rotation: 'roots-onions', bed: 'flat', yield: '2-4 kg/m2', sowDepth: 2, feeding: 'No additional feeding', pests: ['carrot fly','celery fly'], diseases: ['canker'], problems: 'Use fresh seed each year.' },
  'potato-early': { row: 60, rotation: 'potatoes', bed: 'flat', yield: '3-5 kg/m2', sowDepth: 12, feeding: 'General fertiliser at planting', pests: ['slug damage to tubers','wireworm'], diseases: ['blight','scab','blackleg'], problems: 'Blight in wet summers.' },
  'potato-maincrop': { row: 75, rotation: 'potatoes', bed: 'flat', yield: '4-7 kg/m2', sowDepth: 12, feeding: 'General fertiliser at planting', pests: ['slug damage to tubers','wireworm'], diseases: ['blight','scab','blackleg','eelworm'], problems: 'More blight-vulnerable than earlies.' },
  'onion-sets': { row: 25, rotation: 'roots-onions', bed: 'either', yield: '3-5 kg/m2', sowDepth: 1, feeding: 'No additional feeding', pests: ['onion fly','allium leaf miner'], diseases: ['white rot','downy mildew','neck rot'], problems: 'White rot persists 15+ years.' },
  'garlic': { row: 20, rotation: 'roots-onions', bed: 'either', yield: '2-3 kg/m2', sowDepth: 5, feeding: 'No additional feeding', pests: ['allium leaf miner'], diseases: ['white rot','rust'], problems: 'Needs cold period for bulbs.' },
  'leek': { row: 30, rotation: 'roots-onions', bed: 'flat', yield: '3-5 kg/m2', sowDepth: 2, feeding: 'Nitrogen-rich feed monthly', pests: ['allium leaf miner','leek moth','thrips'], diseases: ['rust','white rot'], problems: 'Plant in deep dibbed holes.' },
  'sweetcorn': { row: 45, rotation: 'any', bed: 'flat', yield: '1-2 cobs per plant', sowDepth: 4, feeding: 'Nitrogen-rich feed when tassels appear', pests: ['mice','badgers'], diseases: ['smut'], problems: 'Plant in blocks for pollination.' },
  'broccoli-sprouting': { row: 60, rotation: 'brassicas', bed: 'flat', yield: '1-2 kg per plant', sowDepth: 2, feeding: 'Nitrogen-rich feed monthly', pests: ['cabbage white caterpillars','pigeons','aphids'], diseases: ['clubroot','downy mildew'], problems: 'Occupies ground 9+ months.' },
  'cauliflower': { row: 60, rotation: 'brassicas', bed: 'flat', yield: '1 head per plant', sowDepth: 2, feeding: 'Nitrogen-rich feed every 2 weeks', pests: ['cabbage white caterpillars','pigeons','aphids','flea beetle'], diseases: ['clubroot','downy mildew','ring spot'], problems: 'Most demanding brassica.' },
  'cabbage': { row: 45, rotation: 'brassicas', bed: 'flat', yield: '1 head per plant', sowDepth: 2, feeding: 'Nitrogen-rich feed every 3 weeks', pests: ['cabbage white caterpillars','cabbage root fly','pigeons','slugs'], diseases: ['clubroot','black rot'], problems: 'Net against butterflies and pigeons.' },
  'brussels-sprouts': { row: 60, rotation: 'brassicas', bed: 'flat', yield: '1-2 kg per plant', sowDepth: 2, feeding: 'Nitrogen-rich feed monthly', pests: ['cabbage white caterpillars','aphids','pigeons'], diseases: ['clubroot','downy mildew','ring spot'], problems: 'Plant very firmly and stake.' },
  'turnip': { row: 23, rotation: 'brassicas', bed: 'either', yield: '3-5 kg/m2', sowDepth: 2, feeding: 'No additional feeding', pests: ['flea beetle','cabbage root fly'], diseases: ['clubroot','powdery mildew'], problems: 'Flea beetle attacks seedlings.' },
  'squash': { row: 120, rotation: 'any', bed: 'flat', yield: '3-5 fruits per plant', sowDepth: 3, feeding: 'Liquid feed weekly when fruiting', pests: ['slugs'], diseases: ['powdery mildew'], problems: 'Massive space requirement.' },
  'celery': { row: 30, rotation: 'any', bed: 'flat', yield: '2-3 kg/m2', sowDepth: 0.5, feeding: 'Liquid feed weekly', pests: ['celery fly','slugs','carrot fly'], diseases: ['leaf spot','celery heart rot'], problems: 'Needs constant moisture.' },
  'pepper-sweet': { row: 50, rotation: 'any', bed: 'either', yield: '2-4 kg/m2', sowDepth: 1, feeding: 'Tomato feed weekly when fruiting', pests: ['aphids','whitefly','red spider mite'], diseases: ['blossom end rot','grey mould'], problems: 'Needs very long warm season.' },
  'aubergine': { row: 60, rotation: 'any', bed: 'either', yield: '2-4 kg/m2', sowDepth: 1, feeding: 'Tomato feed weekly when fruiting', pests: ['whitefly','red spider mite','aphids'], diseases: ['verticillium wilt'], problems: 'Needs hottest position available.' },
  'asparagus': { row: 45, rotation: 'permanent', bed: 'raised', yield: '0.5-1 kg/m2', sowDepth: 20, feeding: 'General fertiliser in early spring', pests: ['asparagus beetle','slugs'], diseases: ['rust','violet root rot'], problems: 'Do not harvest for first 2 years.' },
  'rosemary': { row: 60, rotation: 'permanent', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 0.5, feeding: 'No feeding needed', pests: ['rosemary beetle'], diseases: ['root rot in wet conditions'], problems: 'Hates wet feet.' },
  'sage': { row: 45, rotation: 'permanent', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 0.5, feeding: 'No feeding needed', pests: ['capsid bug','slugs'], diseases: ['powdery mildew'], problems: 'Becomes woody after 3-4 years.' },
  'coriander': { row: 20, rotation: 'any', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 1, feeding: 'Light liquid feed monthly', pests: ['aphids'], diseases: ['bacterial leaf spot'], problems: 'Bolts rapidly in heat.' },
  'dill': { row: 25, rotation: 'any', bed: 'either', yield: '0.3-0.5 kg/m2', sowDepth: 1, feeding: 'No feeding needed', pests: ['aphids','caterpillars'], diseases: ['few diseases'], problems: 'Keep away from fennel.' },
  'bay-laurel': { row: 200, rotation: 'permanent', bed: 'either', yield: 'Year-round leaf harvest', sowDepth: 0, feeding: 'Liquid feed monthly in containers', pests: ['bay sucker','scale insects'], diseases: ['bay leaf spot'], problems: 'Protect from cold winds.' },
  'fennel': { row: 45, rotation: 'any', bed: 'flat', yield: '1-2 bulbs per plant', sowDepth: 1, feeding: 'Liquid feed fortnightly', pests: ['aphids'], diseases: ['few diseases'], problems: 'Allelopathic to most vegetables.' },
  'raspberry': { row: 60, rotation: 'permanent', bed: 'either', yield: '2-4 kg per metre of row', sowDepth: 8, feeding: 'General fertiliser in February', pests: ['raspberry beetle','aphids','birds'], diseases: ['spur blight','cane spot','virus'], problems: 'Net against birds.' },
  'blackberry': { row: 300, rotation: 'permanent', bed: 'flat', yield: '5-10 kg per plant', sowDepth: 8, feeding: 'General fertiliser in spring', pests: ['aphids','raspberry beetle'], diseases: ['spur blight','cane spot'], problems: 'Extremely vigorous.' },
  'blueberry': { row: 150, rotation: 'permanent', bed: 'either', yield: '2-5 kg per bush', sowDepth: 0, feeding: 'Ericaceous feed in spring', pests: ['birds'], diseases: ['mummy berry','stem blight'], problems: 'Must have acid soil.' },
  'gooseberry': { row: 150, rotation: 'permanent', bed: 'either', yield: '3-5 kg per bush', sowDepth: 0, feeding: 'General fertiliser in February', pests: ['gooseberry sawfly','birds'], diseases: ['American gooseberry mildew'], problems: 'Check for sawfly from April.' },
  'blackcurrant': { row: 180, rotation: 'permanent', bed: 'flat', yield: '4-5 kg per bush', sowDepth: 5, feeding: 'High nitrogen feed in spring', pests: ['big bud mite','aphids','birds'], diseases: ['reversion virus','mildew'], problems: 'Big bud mite causes rounded buds.' },
  'redcurrant': { row: 150, rotation: 'permanent', bed: 'either', yield: '3-5 kg per bush', sowDepth: 0, feeding: 'General fertiliser in February', pests: ['birds','aphids','gooseberry sawfly'], diseases: ['coral spot','leaf spot'], problems: 'Net against birds.' },
  'apple-dwarf': { row: 200, rotation: 'permanent', bed: 'flat', yield: '5-20 kg per tree', sowDepth: 0, feeding: 'General fertiliser in February', pests: ['codling moth','aphids','woolly aphid','apple sawfly'], diseases: ['scab','canker','mildew','fireblight'], problems: 'Most need pollination partner.' },
  'pear': { row: 300, rotation: 'permanent', bed: 'flat', yield: '5-15 kg per tree', sowDepth: 0, feeding: 'General fertiliser in February', pests: ['pear midge','aphids','codling moth'], diseases: ['scab','canker','fireblight'], problems: 'Flowers early so frost vulnerable.' },
  'plum': { row: 300, rotation: 'permanent', bed: 'flat', yield: '10-30 kg per tree', sowDepth: 0, feeding: 'General fertiliser in February', pests: ['plum moth','aphids','wasps'], diseases: ['silver leaf','brown rot','bacterial canker'], problems: 'Never prune in winter.' },
  'fig': { row: 300, rotation: 'permanent', bed: 'flat', yield: '2-5 kg per tree', sowDepth: 0, feeding: 'Liquid feed fortnightly when fruiting', pests: ['few pests in UK'], diseases: ['coral spot'], problems: 'Restrict roots for best fruiting.' },
  'rhubarb': { row: 90, rotation: 'permanent', bed: 'either', yield: '2-5 kg per crown', sowDepth: 0, feeding: 'Thick mulch of manure annually', pests: ['crown rot','aphids'], diseases: ['crown rot','honey fungus'], problems: 'Do not harvest in first year.' },
  'calendula': { row: 30, rotation: 'any', bed: 'either', yield: 'N/A companion plant', sowDepth: 1, feeding: 'No feeding needed', pests: ['aphids'], diseases: ['powdery mildew'], problems: 'Deadhead for prolonged flowering.' },
  'borage': { row: 40, rotation: 'any', bed: 'either', yield: 'N/A pollinator plant', sowDepth: 2, feeding: 'No feeding needed', pests: ['few pests'], diseases: ['few diseases'], problems: 'Self-seeds prolifically.' },
  'sunflower': { row: 60, rotation: 'any', bed: 'flat', yield: 'N/A ornamental', sowDepth: 2.5, feeding: 'General fertiliser at planting', pests: ['slugs','birds'], diseases: ['downy mildew'], problems: 'Stake tall varieties.' },
  'lavender': { row: 45, rotation: 'permanent', bed: 'either', yield: '0.2-0.3 kg dried flowers/m2', sowDepth: 0.5, feeding: 'No feeding needed', pests: ['rosemary beetle','cuckoo spit'], diseases: ['root rot in wet conditions'], problems: 'Hates wet feet and clay.' },
  'cornflower': { row: 25, rotation: 'any', bed: 'either', yield: 'N/A pollinator plant', sowDepth: 1, feeding: 'No feeding needed', pests: ['aphids'], diseases: ['powdery mildew','rust'], problems: 'Tall varieties may need support.' },
  'sweet-william': { row: 30, rotation: 'any', bed: 'either', yield: 'N/A ornamental', sowDepth: 0.5, feeding: 'Light feed in spring', pests: ['aphids','slugs'], diseases: ['rust','crown rot'], problems: 'Biennial plan for gap year.' },
  'bush-bean': { row: 30, rotation: 'legumes', bed: 'either', yield: '2-3 kg/m2', sowDepth: 5, feeding: 'No additional feeding', pests: ['black bean aphid','slugs'], diseases: ['halo blight','rust'], problems: 'Slugs attack seedlings.' },
  'zucchini': { row: 90, rotation: 'any', bed: 'flat', yield: '4-8 kg/m2', sowDepth: 3, feeding: 'Liquid feed weekly when fruiting', pests: ['slugs','aphids'], diseases: ['powdery mildew','grey mould'], problems: 'Harvest at 15cm for best flavour.' }
};

const tenderSlugs = ['basil-sweet','tomato-tumbling','pepper-chilli','pepper-sweet','aubergine','runner-bean','dwarf-french-bean','bush-bean','courgette','cucumber','squash','sweetcorn','zucchini','nasturtium'];
const semiTenderSlugs = ['fig','bay-laurel','coriander'];
const veryHardySlugs = ['kale','brussels-sprouts','leek','parsnip','rhubarb','broad-bean','gooseberry','blackcurrant','redcurrant','apple-dwarf','pear','plum','raspberry','blackberry'];
const acidSlugs = ['blueberry'];
const alkalineSlugs = ['lavender','rosemary','sage','thyme','oregano'];

let updated = 0;
let missing = [];
for (const plant of plants) {
  const data = inGroundData[plant.slug];
  if (!data) { missing.push(plant.slug); continue; }
  plant.inGround = {
    rowSpacingCm: data.row,
    plantSpacingCm: plant.spacingCm,
    sowDepthCm: data.sowDepth,
    bedType: data.bed,
    expectedYieldPerM2: data.yield,
    rotation: data.rotation,
    feeding: data.feeding,
    pests: data.pests,
    diseases: data.diseases,
    commonProblems: data.problems
  };
  if (!plant.hardiness) {
    if (tenderSlugs.includes(plant.slug)) plant.hardiness = 'H2';
    else if (semiTenderSlugs.includes(plant.slug)) plant.hardiness = 'H3';
    else if (veryHardySlugs.includes(plant.slug)) plant.hardiness = 'H6';
    else plant.hardiness = 'H5';
  }
  if (!plant.soil) {
    if (acidSlugs.includes(plant.slug)) {
      plant.soil = { phRange: [4.5, 5.5], type: 'acid, moist, well-drained', notes: 'Must have ericaceous compost.' };
    } else if (alkalineSlugs.includes(plant.slug)) {
      plant.soil = { phRange: [6.5, 8.0], type: 'well-drained, poor to moderate', notes: 'Mediterranean herbs prefer poor alkaline soil.' };
    } else {
      plant.soil = { phRange: [6.0, 7.0], type: 'fertile, well-drained', notes: 'Grows well in most garden soils.' };
    }
  }
  updated++;
}

console.log('Updated:', updated);
console.log('Total plants:', plants.length);
if (missing.length) console.log('Missing:', missing.join(', '));

fs.writeFileSync('/Users/davidcrabtree/garden-plotter/data/plants.json', JSON.stringify(plants, null, 2) + '\n');
console.log('Written to data/plants.json');

fs.copyFileSync('/Users/davidcrabtree/garden-plotter/data/plants.json', '/Users/davidcrabtree/garden-plotter/public/data/plants.json');
console.log('Copied to public/data/plants.json');
