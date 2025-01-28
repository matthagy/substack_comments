# My Substack Comments

Source code for a small webpage that displays my Substack comments in a searchable format.
You can check it out at https://matthagy.github.io/substack_comments/

This is a public demo of a custom Substack front-end that I'm currently working on.
Since this is public, it only includes my own comments.
My personal, private version has all ~200k comments from all subscribers and more features.
Hope to eventually release the custom front-end as open source code so that others can also use these features.


Comments are fetched using [substack_client](https://github.com/matthagy/substack_client) as described in,
[Developing a Substack client to fetch posts and comments](https://matthagy.substack.com/p/developing-a-custom-substack-front).

Run locally using
```shell
python3 -m http.server
```

Then visit the given URL in your browser. Eg `http://[::]:8000/`
