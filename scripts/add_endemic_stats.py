#!/usr/bin/env python3
import os
os.chdir(os.path.expanduser("~/Documents/Claude/GranWatch data from Manus"))
s = open("server/contentRoutes.ts").read()
old = """<p>A visit is not a nicety. For an isolated elder, it is preventive medicine that no pill replicates.</p>"""
new = """<p>And the problem is compounding from both directions. <strong>The world's population aged 60 and older will double from about 1 billion to 2.1 billion by 2050</strong> (WHO, Ageing and Health) — every year there are more grans, and families more scattered around them. Meanwhile <strong>mental health has overtaken cancer as the world's most-cited health concern: 45% of people across 31 countries now name it their top worry, up from 27% in 2018</strong> (Ipsos Health Service Report, 2024). Loneliness in old age sits exactly at the intersection of those two curves.</p>
<p>A visit is not a nicety. For an isolated elder, it is preventive medicine that no pill replicates.</p>"""
assert s.count(old) == 1, s.count(old)
open("server/contentRoutes.ts", "w").write(s.replace(old, new))
print("patched")
