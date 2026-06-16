const fs = require('fs');
const path = require('path');

const config = {
    'Dream': {
        gsc: 'XcTNSu_Bk0MIUySSLbzcRoQDOEw6njPcrnP8vuOXDZA',
        ga4: 'G-TGKW4T0660'
    },
    'Legend': {
        gsc: 'Ngkdi42DNOqhWenlhewSblKXGaR5DskpuN0suPXOsig',
        ga4: 'G-LHWZERS0BL'
    },
    'joaillerie': {
        gsc: '3qiqtNs2DugnInQpub3GUXGE2nbtRyiaHOE4ZZPef8s',
        ga4: 'G-1XPYEM2DT2'
    },
    'Desk': {
        gsc: 'QkFYvqe3IOSrmtbrzarrVHw95Unyzzo86lZvA-MSYJE',
        ga4: 'G-6BS1JYHXLS'
    }
};

Object.keys(config).forEach(site => {
    const baseHeadPath = path.join(__dirname, site, 'src', 'components', 'BaseHead.astro');
    if (!fs.existsSync(baseHeadPath)) {
        console.error(`[${site}] BaseHead.astro not found!`);
        return;
    }

    let content = fs.readFileSync(baseHeadPath, 'utf8');
    let changed = false;

    if (content.includes('YOUR_GSC_VERIFICATION_CODE_HERE')) {
        content = content.replace(/YOUR_GSC_VERIFICATION_CODE_HERE/g, config[site].gsc);
        changed = true;
    }

    if (content.includes('G-XXXXXXXXXX')) {
        content = content.replace(/G-XXXXXXXXXX/g, config[site].ga4);
        changed = true;
    }

    if (changed) {
        fs.writeFileSync(baseHeadPath, content);
        console.log(`[${site}] Successfully updated GA4 and GSC codes.`);
    } else {
        console.log(`[${site}] Codes were already updated or placeholders not found.`);
    }
});
