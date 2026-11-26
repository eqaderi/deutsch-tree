#!/usr/bin/perl
# The Mac start file's web server. Uses only Perl and modules that ship with macOS.
#
#   perl serve.pl <app folder> [<first port>]
#
# When it starts, it rewrites private/packs.json from the subfolders that hold
# a pack.json (the rules of src/pack-builder/pack-list.ts) and writes the
# address a phone opens into private/address.json. Then it opens the browser
# (unless NO_OPEN is set) and serves the app folder to this computer and to every device on the home network: one
# child process per connection, GET and HEAD, single byte ranges (iPhones
# need them to play and seek recordings).
use strict;
use warnings;
use IO::Socket::INET;
use POSIX ();

my ($root, $first_port) = @ARGV;
die "usage: serve.pl <app folder> [<first port>]\n" unless defined $root;
$first_port = 8000 unless defined $first_port;
$root =~ s{/+$}{};
die "There is no index.html in $root.\n" unless -f "$root/index.html";

my %mime = (
  html => 'text/html; charset=utf-8', js => 'text/javascript; charset=utf-8',
  mjs => 'text/javascript; charset=utf-8', json => 'application/json; charset=utf-8',
  css => 'text/css; charset=utf-8', svg => 'image/svg+xml', txt => 'text/plain; charset=utf-8',
  map => 'application/json; charset=utf-8', png => 'image/png', jpg => 'image/jpeg', jpeg => 'image/jpeg',
  webp => 'image/webp', gif => 'image/gif', ico => 'image/x-icon', pdf => 'application/pdf',
  wasm => 'application/wasm', bcmap => 'application/octet-stream', pfb => 'application/octet-stream',
  ttf => 'font/ttf', otf => 'font/otf', woff => 'font/woff', woff2 => 'font/woff2',
  mp3 => 'audio/mpeg', m4a => 'audio/mp4', ogg => 'audio/ogg', opus => 'audio/ogg', wav => 'audio/wav',
);

my $private = "$root/private";
mkdir $private unless -d $private;
my @packs = list_packs($private);
write_file("$private/packs.json", '{"format":1,"packs":[' . join(',', map { "\"$_\"" } @packs) . "]}\n");

my ($server, $port);
for my $p ($first_port .. $first_port + 9) {
  $server = IO::Socket::INET->new(LocalAddr => '0.0.0.0', LocalPort => $p, Proto => 'tcp', Listen => 64, ReuseAddr => 1);
  if ($server) { $port = $p; last; }
}
die "No free port between $first_port and " . ($first_port + 9) . ". Is the app already running in another window?\n"
  unless $server;

my $lan_ip = lan_ip();
my $phone = defined $lan_ip ? "http://$lan_ip:$port/" : undef;
write_file("$private/address.json", '{"format":1,"phone":' . (defined $phone ? "\"$phone\"" : 'null') . "}\n");

$SIG{CHLD} = 'IGNORE';   # no zombies
$SIG{PIPE} = 'IGNORE';
$| = 1;
print "\n", '=' x 66, "\n";
print " deutsch-tree is running.\n\n";
print " On this computer:  http://localhost:$port/\n";
print defined $phone
  ? " On a phone or tablet on the same Wi-Fi:  $phone\n"
  : " On a phone: this computer is not on a network. Connect it to the Wi-Fi and start again.\n";
print "\n Leave this window open while you use the app.\n";
print " To stop the app: close this window, or press Control-C.\n";
print '=' x 66, "\n\n";
system('/usr/bin/open', "http://localhost:$port/") if $^O eq 'darwin' && !$ENV{NO_OPEN};

while (1) {
  my $client = $server->accept or next;
  my $pid = fork();
  if (!defined $pid) { close $client; next; }
  if ($pid) { close $client; next; }
  close $server;
  handle($client);
  close $client;
  POSIX::_exit(0);
}

# The address other devices on the home network use for this computer, or undef.
# "Connecting" a UDP socket sends nothing; it only makes the system pick the
# address it would send from.
sub lan_ip {
  my $udp = IO::Socket::INET->new(Proto => 'udp', PeerAddr => '192.0.2.1', PeerPort => 9) or return undef;
  my $ip = $udp->sockhost;
  close $udp;
  return undef if !defined $ip || $ip eq '0.0.0.0' || $ip =~ /^127\./ || $ip =~ /^169\.254\./;
  return $ip;
}

# The packs in a folder: every subfolder with a pack id for a name and a pack.json in it, in name order.
sub list_packs {
  my ($dir) = @_;
  opendir(my $dh, $dir) or return ();
  my @ids = sort grep { /^[a-z0-9]+(-[a-z0-9]+)*$/ && -d "$dir/$_" && -f "$dir/$_/pack.json" } readdir $dh;
  closedir $dh;
  return @ids;
}

sub write_file {
  my ($file, $text) = @_;
  if (open(my $fh, '>', $file)) { print $fh $text; close $fh; }
  else { print "Could not write $file: $!\n"; }
}

sub handle {
  my ($c) = @_;
  local $SIG{ALRM} = sub { POSIX::_exit(0) };   # drop idle connections
  alarm 10;
  my $request = <$c>;
  return unless defined $request;
  my %h;
  while (defined(my $line = <$c>)) {
    $line =~ s/\r?\n$//;
    last if $line eq '';
    $h{lc $1} = $2 if $line =~ /^([^:]+):\s*(.*)$/;
  }
  alarm 0;
  my ($method, $target) = $request =~ m{^(GET|HEAD) (\S+) HTTP/1\.[01]} or return respond($c, 400, 'Bad Request');
  my $path = $target;
  $path =~ s/[?#].*$//;
  $path =~ s/%([0-9A-Fa-f]{2})/chr(hex($1))/ge;
  return respond($c, 403, 'Forbidden') if $path !~ m{^/} || $path =~ m{(^|/)\.\.(/|$)} || $path =~ /\0/;
  my $file = $root . $path;
  $file .= 'index.html' if -d $file && $file =~ m{/$};
  return respond($c, 404, 'Not Found') unless -f $file && -r $file;

  my $size = -s $file;
  my ($ext) = $file =~ /\.([^.\/]+)$/;
  my $type = $mime{lc($ext // '')} // 'application/octet-stream';
  my ($status, $start, $end) = ('200 OK', 0, $size - 1);
  if (defined $h{range} && $h{range} =~ /^bytes=(\d*)-(\d*)$/ && ($1 ne '' || $2 ne '') && $size > 0) {
    my ($a, $b) = ($1, $2);
    if ($a eq '') { $start = $size - $b; $start = 0 if $start < 0; }
    else { $start = $a; $end = $b if $b ne '' && $b < $size; }
    if ($start > $end) {
      print $c "HTTP/1.1 416 Range Not Satisfiable\r\nContent-Range: bytes */$size\r\nContent-Length: 0\r\nConnection: close\r\n\r\n";
      return;
    }
    $status = '206 Partial Content';
  }
  my $length = $size == 0 ? 0 : $end - $start + 1;
  print $c "HTTP/1.1 $status\r\nContent-Type: $type\r\nContent-Length: $length\r\nAccept-Ranges: bytes\r\n"
    . "Cache-Control: no-cache\r\nConnection: close\r\n";
  print $c "Content-Range: bytes $start-$end/$size\r\n" if $status =~ /^206/;
  print $c "\r\n";
  return unless $method eq 'GET' && $length > 0;
  open(my $fh, '<', $file) or return;
  binmode $fh; binmode $c;
  seek($fh, $start, 0);
  my $left = $length;
  while ($left > 0) {
    my $n = read($fh, my $buf, $left < 65536 ? $left : 65536);
    last unless $n;
    print $c $buf or last;
    $left -= $n;
  }
  close $fh;
}

sub respond {
  my ($c, $code, $text) = @_;
  my $body = "$code $text\n";
  print $c "HTTP/1.1 $code $text\r\nContent-Type: text/plain; charset=utf-8\r\nContent-Length: "
    . length($body) . "\r\nConnection: close\r\n\r\n$body";
}
